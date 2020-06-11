// Package custom implements push notification plugin for Tinode Push Gateway.
package custom

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/tinode/chat/server/push"
	"github.com/tinode/chat/server/push/fcm"
	"github.com/tinode/chat/server/store"
)

const (
	bufferSize = 1024
)

var handler Handler

// Handler represents state of TNPG push client.
type Handler struct {
	input   chan *push.Receipt
	stop    chan bool
	postURL string
}

type configType struct {
	Enabled bool   `json:"enabled"`
	Address string `json:"address"`
}

type tnpgResponse struct {
	MessageID    string `json:"msg_id,omitempty"`
	ErrorCode    string `json:"errcode,omitempty"`
	ErrorMessage string `json:"errmsg,omitempty"`
}

type batchResponse struct {
	// Number of successfully sent messages.
	SuccessCount int `json:"sent_count"`
	// Number of failures.
	FailureCount int `json:"fail_count"`
	// Error code and message if the entire batch failed.
	FatalCode    string `json:"errcode,omitempty"`
	FatalMessage string `json:"errmsg,omitempty"`
	// Individual reponses in the same order as messages. Could be nil if the entire batch failed.
	Responses []*tnpgResponse `json:"resp,omitempty"`

	// Local values
	httpCode   int
	httpStatus string
}

// Error codes copied from https://github.com/firebase/firebase-admin-go/blob/master/messaging/messaging.go
const (
	internalError                  = "internal-error"
	invalidAPNSCredentials         = "invalid-apns-credentials"
	invalidArgument                = "invalid-argument"
	messageRateExceeded            = "message-rate-exceeded"
	mismatchedCredential           = "mismatched-credential"
	registrationTokenNotRegistered = "registration-token-not-registered"
	serverUnavailable              = "server-unavailable"
	tooManyTopics                  = "too-many-topics"
	unknownError                   = "unknown-error"
)

// Init initializes the handler
func (Handler) Init(jsonconf string) error {
	var config configType
	if err := json.Unmarshal([]byte(jsonconf), &config); err != nil {
		return errors.New("failed to parse config: " + err.Error())
	}

	if !config.Enabled {
		return nil
	}

	if config.Address == "" {
		return errors.New("custom push not specified")
	}

	handler.postURL = config.Address
	handler.input = make(chan *push.Receipt, bufferSize)
	handler.stop = make(chan bool, 1)

	go func() {
		for {
			select {
			case rcpt := <-handler.input:
				go sendPushes(rcpt, &config)
			case <-handler.stop:
				return
			}
		}
	}()

	return nil
}

func postMessage(body interface{}, config *configType) (*batchResponse, error) {

	buf, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", handler.postURL, bytes.NewBuffer(buf))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	var batch batchResponse
	batch.httpCode = resp.StatusCode
	batch.httpStatus = resp.Status

	return &batch, nil
}

func sendPushes(rcpt *push.Receipt, config *configType) {
	if resp, err := postMessage(rcpt, config); err != nil {
		log.Println("custom push request failed:", err)
	} else if resp.httpCode >= 300 {
		log.Println("custom push rejected:", resp.httpStatus)
	} else if resp.FatalCode != "" {
		log.Println("custom push failed:", resp.FatalMessage)
	}
}

func handleResponse(batch *batchResponse, messages []fcm.MessageData) {
	if batch.FailureCount <= 0 {
		return
	}

	for i, resp := range batch.Responses {
		switch resp.ErrorCode {
		case "": // no error
		case messageRateExceeded, serverUnavailable, internalError, unknownError:
			// Transient errors. Stop sending this batch.
			log.Println("custom push transient failure", resp.ErrorMessage)
			return
		case mismatchedCredential, invalidArgument:
			// Config errors
			log.Println("custom push invalid config", resp.ErrorMessage)
			return
		case registrationTokenNotRegistered:
			// Token is no longer valid.
			log.Println("custom push invalid token", resp.ErrorMessage)
			if err := store.Devices.Delete(messages[i].Uid, messages[i].DeviceId); err != nil {
				log.Println("custom push: failed to delete invalid token", err)
			}
		default:
			log.Println("custom push returned error", resp.ErrorMessage)
		}
	}
}

// IsReady checks if the handler is initialized.
func (Handler) IsReady() bool {
	return handler.input != nil
}

// Push returns a channel that the server will use to send messages to.
// If the adapter blocks, the message will be dropped.
func (Handler) Push() chan<- *push.Receipt {
	return handler.input
}

// Stop terminates the handler's worker and stops sending pushes.
func (Handler) Stop() {
	handler.stop <- true
}

func init() {
	push.Register("custom", &handler)
}
