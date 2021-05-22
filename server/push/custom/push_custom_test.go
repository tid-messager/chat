// Package custom implements push notification plugin for Tinode Push Gateway.

package custom

import (
	"testing"
	"time"

	"github.com/tinode/chat/server/push"
	t "github.com/tinode/chat/server/store/types"
	types "github.com/tinode/chat/server/store/types"
)

func fakeDevicesGetAll(uid ...t.Uid) (map[t.Uid][]t.DeviceDef, int, error) {
	count := len(uid)
	result := make(map[types.Uid][]types.DeviceDef)
	dd := []types.DeviceDef{
		{
			DeviceId: "fakeDeviceId",
		},
	}
	result[17232998450318614703] = dd
	return result, count, nil
}

func Test_sendPushes(t *testing.T) {
	devicesGetAll = fakeDevicesGetAll
	handler.postURL = "https://webhook.site/dd091344-20ae-4f4f-9112-112cdf57f8ab"
	type args struct {
		rcpt   *push.Receipt
		config *configType
	}
	tests := []struct {
		name string
		args args
	}{
		{
			name: "first",
			args: args{
				rcpt: &push.Receipt{
					Payload: push.Payload{
						Content:     "Вечер в хату",
						From:        "fakeUser",
						SeqId:       100500,
						ContentType: "",
						What:        "msg",
						Silent:      false,
						Topic:       "fakeTopic",
						Timestamp:   time.Now(),
					},
					To: map[types.Uid]push.Recipient{
						17232998450318614703: {
							Unread:    6,
							Delivered: 0,
						},
					},
				},
				config: &configType{
					Address: "https://mobile.ditcloud.ru/tinode/notify",
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sendPushes(tt.args.rcpt, tt.args.config)
		})
	}
}
