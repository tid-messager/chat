package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/tinode/chat/server/auth"
)

type user struct {
	Anon     string `json:"anon,omitempty"`
	Auth     string `json:"auth,omitempty"`
	Authlvl  string `json:"authlvl,omitempty"`
	Features string `json:"features,omitempty"`
	Password string `json:"password,omitempty"`
	Private  string `json:"private,omitempty"`
	Public   struct {
		Fn    string `json:"fn,omitempty"`
		Photo struct {
			Data string `json:"data,omitempty"`
			Type string `json:"type,omitempty"`
		} `json:"photo,omitempty"`
	} `json:"public,omitempty"`
	Tags     []string      `json:"tags,omitempty"`
	UID      string        `json:"uid,omitempty"`
	Lifetime time.Duration `json:"lifetime,omitempty"`
}

// User initialization data when creating a new user.
type newAccount struct {
	// Default access mode
	Auth string `json:"auth,omitempty"`
	Anon string `json:"anon,omitempty"`
	// User's Public data
	Public interface{} `json:"public,omitempty"`
	// Per-subscription private data
	Private interface{} `json:"private,omitempty"`
}

// Response from the server.
type response struct {
	// Error message in case of an error.
	Err string `json:"err,omitempty"`
	// Optional auth record
	Record *auth.Rec `json:"rec,omitempty"`
	// Optional byte slice
	ByteVal []byte `json:"byteval,omitempty"`
	// Optional time value
	TimeVal time.Time `json:"ts,omitempty"`
	// Boolean value
	BoolVal bool `json:"boolval,omitempty"`
	// String slice value
	StrSliceVal []string `json:"strarr,omitempty"`
	// Account creation data
	NewAcc *newAccount `json:"newacc,omitempty"`
}

var users = map[string]user{}

func main() {

	var err error
	data, err := ioutil.ReadFile("dummy_data.json")
	if err != nil {
		fmt.Println("Unable read file:", err)
		return
	}

	err = json.Unmarshal(data, &users)
	if err != nil {
		fmt.Println("Unable unmarshal data:", err)
		return
	}

	r := mux.NewRouter()
	r.HandleFunc("/auth", authHandler)
	r.HandleFunc("/link", linkHandler)
	r.HandleFunc("/rtagns", rtagnsHandler)
	http.Handle("/", r)

	srv := &http.Server{
		Handler: r,
		Addr:    "localhost:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}

func linkHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("", time.Now(), " link handler")
	body, _ := ioutil.ReadAll(r.Body)
	payload := struct {
		Sercet string `json:"secret"`
		Rec    user   `json:"rec"`
	}{}
	json.Unmarshal(body, &payload)

	username, _ := parseSecret(payload.Sercet)
	u := users[username]
	u.UID = payload.Rec.UID
	users[username] = u
	fmt.Println(payload)

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{}`)

}

func authHandler(w http.ResponseWriter, r *http.Request) {

	fmt.Println("", time.Now(), " auth handler")
	body, _ := ioutil.ReadAll(r.Body)
	payload := struct {
		Sercet string `json:"secret"`
	}{}
	json.Unmarshal(body, &payload)

	username, _ := parseSecret(payload.Sercet)
	u := users[username]
	var res interface{}
	if u.UID != "" {
		res = map[string]user{
			"rec": {
				UID:      u.UID,
				Authlvl:  u.Authlvl,
				Features: u.Features,
			},
		}
	} else {
		res = map[string]interface{}{
			"rec": user{
				Tags:     u.Tags,
				Authlvl:  u.Authlvl,
				Features: u.Features,
				Lifetime: 5000,
			},
			"newacc": newAccount{
				Auth:    u.Auth,
				Anon:    u.Anon,
				Public:  u.Public,
				Private: u.Private,
			},
		}
	}

	js, err := json.Marshal(res)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(js)
}

func rtagnsHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("", time.Now(), " rtags handler")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"strarr": ["rest", "email"]}`)
}

func parseSecret(secret string) (string, string) {

	payload, _ := base64.URLEncoding.DecodeString(string(secret))
	pair := strings.SplitN(string(payload), ":", 2)
	return pair[0], pair[1]

}
