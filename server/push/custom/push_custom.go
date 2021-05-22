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
	t "github.com/tinode/chat/server/store/types"
)

const (
	baseTargetAddress = "https://pushgw.tinode.co/push/"
	batchSize         = 100
	bufferSize        = 1024
)

var handler Handler

type getAll func(uid ...t.Uid) (map[t.Uid][]t.DeviceDef, int, error)

var devicesGetAll getAll

// Handler represents state of TNPG push client.
type Handler struct {
	input   chan *push.Receipt
	stop    chan bool
	postURL string
}

type configType struct {
	Enabled bool `json:"enabled"`
	//OrgName   string `json:"org"`
	//AuthToken string `json:"token"`
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
	httpCode    int
	httpStatus  string
	nothingSend bool
}

type message struct {
	Payload push.Payload              `json:"payload"`
	To      map[string]push.Recipient `json:"to"`
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

	devicesGetAll = store.Devices.GetAll

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

func PrepareNotifications(rcpt *push.Receipt) (*message, int, error) {

	msg := message{
		Payload: rcpt.Payload,
		To:      make(map[string]push.Recipient),
	}

	// List of UIDs for querying the database
	uids := make([]t.Uid, len(rcpt.To))
	// These devices were online in the topic when the message was sent.
	skipDevices := make(map[string]struct{})
	i := 0
	for uid, to := range rcpt.To {
		uids[i] = uid
		i++
		// Some devices were online and received the message. Skip them.
		for _, deviceID := range to.Devices {
			skipDevices[deviceID] = struct{}{}
		}
	}

	devices, count, err := devicesGetAll(uids...)
	if err != nil {
		return nil, 0, err
	}

	if count == 0 {
		return nil, count, nil
	}

	for uid, devList := range devices {
		// пропускаем тех кто получил сообщения
		// в интерактивном режиме
		if rcpt.To[uid].Delivered > 0 {
			continue
		}
		for i := range devList {
			d := &devList[i]
			if _, ok := skipDevices[d.DeviceId]; !ok && d.DeviceId != "" {
				msg.To[d.DeviceId] = push.Recipient{
					Delivered: rcpt.To[uid].Delivered,
					Unread:    rcpt.To[uid].Unread,
				}
			}
		}
	}

	return &msg, -100, nil
}

func postMessage(rcpt *push.Receipt, config *configType) (*batchResponse, error) {

	msg, count, err := PrepareNotifications(rcpt)
	if err != nil {
		return nil, err
	}

	if count == 0 {
		return &batchResponse{nothingSend: true}, nil
	}

	buf, err := json.Marshal(msg)
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

	return &batchResponse{httpCode: resp.StatusCode, httpStatus: resp.Status}, nil
}

func sendPushes(rcpt *push.Receipt, config *configType) {
	if resp, err := postMessage(rcpt, config); err != nil {
		log.Println("custom push request failed:", err)
	} else if resp.nothingSend {
		log.Println("custom push: nothing to send")
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
