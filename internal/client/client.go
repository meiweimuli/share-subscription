package client

import (
	"github.com/go-resty/resty/v2"
	"time"
)

var RestyClient *resty.Client
var UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
var DefaultTimeout = time.Second * 30

func InitClient() {
	RestyClient = NewRestyClient()
}

func NewRestyClient() *resty.Client {
	client := resty.New().
		SetHeader("user-agent", UserAgent).
		SetRetryCount(3).
		SetRetryResetReaders(true).
		SetTimeout(DefaultTimeout)
	return client
}
