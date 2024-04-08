package aliyun

import (
	"ShareSubscription/internal/client"
	utils2 "ShareSubscription/internal/utils"
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/dustinxie/ecc"
	"github.com/go-resty/resty/v2"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
	"net/http"
	"time"
)

type Aliyun struct {
	RefreshToken     string
	DriveId          string
	UserID           string
	AccessToken      string
	refreshTokenCron *utils2.Cron
	renewSessionCron *utils2.Cron
	OnChange         func(aliyun *Aliyun)
}

type State struct {
	deviceID   string
	signature  string
	retry      int
	privateKey *ecdsa.PrivateKey
}

var Single *Aliyun

var stateMap = map[string]*State{}

func (a *Aliyun) sign() {
	state, _ := stateMap[a.UserID]
	secpAppID := "5dde4e1bdf9e4966b387ba58f4b3fdc3"
	singdata := fmt.Sprintf("%s:%s:%s:%d", secpAppID, state.deviceID, a.UserID, 0)
	hash := sha256.Sum256([]byte(singdata))
	data, _ := ecc.SignBytes(state.privateKey, hash[:], ecc.RecID|ecc.LowerS)
	state.signature = hex.EncodeToString(data)
}

func (a *Aliyun) refreshToken() error {
	url := "https://api.aliyundrive.com/token/refresh"
	var resp TokenResp
	var e RespErr
	_, err := client.RestyClient.R().
		//ForceContentType("application/json").
		SetBody(map[string]any{"refresh_token": a.RefreshToken}).
		SetResult(&resp).
		SetError(&e).
		Post(url)
	if err != nil {
		return err
	}
	if e.Code != "" {
		return fmt.Errorf("failed to refresh token: %s", e.Message)
	}
	if resp.RefreshToken == "" {
		return errors.New("failed to refresh token: refresh token is empty")
	}
	a.RefreshToken, a.AccessToken = resp.RefreshToken, resp.AccessToken
	if a.OnChange != nil {
		a.OnChange(a)
	}
	return nil
}

func (a *Aliyun) request(url, method string, callback ReqCallback, resp interface{}) ([]byte, error, RespErr) {
	state, ok := stateMap[a.UserID]
	req := client.RestyClient.R()
	if !ok {
		if url != "https://user.aliyundrive.com/v2/user/get" {
			return nil, fmt.Errorf("can't load user state"), RespErr{}
		} else {
			state = &State{}
		}
	}
	req.SetHeaders(map[string]string{
		"Authorization":  "Bearer\t" + a.AccessToken,
		"content-type":   "application/json",
		"origin":         "https://www.alipan.com",
		"Referer":        "https://www.alipan.com/",
		"X-Signature":    state.signature,
		"x-a.request-id": uuid.NewString(),
		"X-Canary":       "client=web,app=adrive,version=v4.9.0",
		"X-Device-Id":    state.deviceID,
	})
	if callback != nil {
		callback(req)
	} else {
		req.SetBody("{}")
	}
	if resp != nil {
		req.SetResult(resp)
	}
	var e RespErr
	req.SetError(&e)
	res, err := req.Execute(method, url)
	if err != nil {
		return nil, err, e
	}
	if e.Code != "" {
		switch e.Code {
		case "AccessTokenInvalid":
			err = a.refreshToken()
			if err != nil {
				return nil, err, e
			}
		case "DeviceSessionSignatureInvalid":
			err = a.createSession()
			if err != nil {
				return nil, err, e
			}
		default:
			return nil, errors.New(e.Message), e
		}
		return a.request(url, method, callback, resp)
	} else if res.IsError() {
		return nil, errors.New("bad status code " + res.Status()), e
	}
	return res.Body(), nil, e
}

func (a *Aliyun) createSession() error {
	state, _ := stateMap[a.UserID]
	a.sign()
	state.retry++
	if state.retry > 3 {
		state.retry = 0
		return fmt.Errorf("createSession failed after three retries")
	}
	_, err, _ := a.request("https://api.aliyundrive.com/users/v1/users/device/create_session", http.MethodPost, func(req *resty.Request) {
		req.SetBody(map[string]any{
			"deviceName": "Chrome浏览器",
			"modelName":  "Windows网页版",
			"pubKey":     publicKeyToHex(&state.privateKey.PublicKey),
		})
	}, nil)
	if err == nil {
		state.retry = 0
		if a.renewSessionCron == nil {
			a.renewSessionCron = utils2.NewCron(time.Minute * 11)
			a.renewSessionCron.Do(func() {
				err := a.renewSession()
				if err != nil {
					log.Errorf("%+v", err)
				}
			})
		}

	}

	return err
}

func (a *Aliyun) renewSession() error {
	_, err, _ := a.request("https://api.aliyundrive.com/users/v1/users/device/renew_session", http.MethodPost, nil, nil)
	return err
}

func (a *Aliyun) Init() error {

	if a.AccessToken == "" {
		err := a.refreshToken()
		if err != nil {
			return err
		}
	}

	res, err, _ := a.request("https://user.aliyundrive.com/v2/user/get", http.MethodPost, nil, nil)
	if err != nil {
		return err
	}
	//DriveId = Json.Get(res, "default_drive_id").ToString()
	a.DriveId = "713121943"
	a.UserID = utils2.Json.Get(res, "user_id").ToString()
	a.refreshTokenCron = utils2.NewCron(time.Hour * 2)
	a.refreshTokenCron.Do(func() {
		err := a.refreshToken()
		if err != nil {
			log.Errorf("%+v", err)
		}
	})
	// init deviceID
	deviceID := utils2.HashData(utils2.SHA256, []byte(a.UserID))
	// init privateKey
	privateKey, _ := newPrivateKeyFromHex(deviceID)
	state := &State{
		privateKey: privateKey,
		deviceID:   deviceID,
	}
	stateMap[a.UserID] = state
	// init signature
	a.sign()

	err = a.createSession()
	if err != nil {
		return err
	}

	log.Infof("aliyun inited, accessToken: %s,deviceId: %s, signature: %s", a.AccessToken, state.deviceID, state.signature)
	return nil
}

func (a *Aliyun) GetFiles(fileId string) ([]File, error) {
	marker := "first"
	res := make([]File, 0)
	for marker != "" {
		if marker == "first" {
			marker = ""
		}
		var resp Files
		data := map[string]any{
			"drive_id":                a.DriveId,
			"fields":                  "*",
			"image_thumbnail_process": "image/resize,w_256/format,avif",
			"image_url_process":       "image/resize,w_1920/format,avif",
			"limit":                   200,
			"marker":                  marker,
			"order_by":                "updated_at",
			"order_direction":         "DESC",
			"parent_file_id":          fileId,
			"video_thumbnail_process": "video/snapshot,t_120000,f_jpg,m_lfit,w_256,ar_auto,m_fast",
			"url_expire_sec":          14400,
			"all":                     false,
		}
		_, err, _ := a.request("https://api.aliyundrive.com/adrive/v3/file/list", http.MethodPost, func(req *resty.Request) {
			req.SetBody(data)
		}, &resp)

		if err != nil {
			return nil, err
		}
		marker = resp.NextMarker
		res = append(res, resp.Items...)
	}
	return res, nil
}

func (a *Aliyun) GetFile(fileId string) (*File, error) {
	var resp File
	data := map[string]any{
		"drive_id": a.DriveId,
		"file_id":  fileId,
	}
	_, err, _ := a.request("https://api.aliyundrive.com/v2/file/get", http.MethodPost, func(req *resty.Request) {
		req.SetBody(data)
	}, &resp)

	if err != nil {
		return nil, err
	}

	return &resp, nil

}

func (a *Aliyun) GetPath(fileId string) ([]File, error) {
	var resp Files
	data := map[string]any{
		"drive_id": a.DriveId,
		"file_id":  fileId,
	}
	_, err, _ := a.request("https://api.aliyundrive.com/adrive/v1/file/get_path", http.MethodPost, func(req *resty.Request) {
		req.SetBody(data)
	}, &resp)

	if err != nil {
		return nil, err
	}

	return resp.Items, nil

}

func (a *Aliyun) SaveShare(shareId, srcId, shareToken, dstId string) (string, error) {
	res, err, _ := a.request("https://api.aliyundrive.com/adrive/v4/batch", http.MethodPost, func(req *resty.Request) {
		req.SetHeader("x-share-token", shareToken)
		req.SetBody(map[string]any{
			"requests": []map[string]any{
				{
					"headers": map[string]any{
						"Content-Type": "application/json",
					},
					"method": "POST",
					"id":     "0",
					"body": map[string]any{
						"file_id":           srcId,
						"to_drive_id":       a.DriveId,
						"to_parent_file_id": dstId,
						"share_id":          shareId,
						"auto_rename":       true,
					},
					"url": "/file/copy",
				},
			},
			"resource": "file",
		})
	}, nil)
	if err != nil {
		return "", err
	}
	status := utils2.Json.Get(res, "responses", 0, "status").ToInt()
	if status < 400 && status >= 100 {
		fileId := utils2.Json.Get(res, "responses", 0, "body", "file_id").ToString()
		return fileId, nil
	}
	return "", errors.New(string(res))
}

func (a *Aliyun) batch(srcId, dstId string, url string) error {
	res, err, _ := a.request("https://api.aliyundrive.com/adrive/v4/batch", http.MethodPost, func(req *resty.Request) {
		req.SetBody(map[string]any{
			"requests": []map[string]any{
				{
					"headers": map[string]any{
						"Content-Type": "application/json",
					},
					"method": "POST",
					"id":     srcId,
					"body": map[string]any{
						"drive_id":          a.DriveId,
						"file_id":           srcId,
						"to_drive_id":       a.DriveId,
						"to_parent_file_id": dstId,
					},
					"url": url,
				},
			},
			"resource": "file",
		})
	}, nil)
	if err != nil {
		return err
	}
	status := utils2.Json.Get(res, "responses", 0, "status").ToInt()
	if status < 400 && status >= 100 {
		return nil
	}
	return errors.New(string(res))
}

func (a *Aliyun) Move(srcFileId, dstDirId string) error {
	err := a.batch(srcFileId, dstDirId, "/file/move")
	return err
}

func (a *Aliyun) Copy(srcFileId, dstDirId string) error {
	err := a.batch(srcFileId, dstDirId, "/file/copy")
	return err
}

func (a *Aliyun) Rename(fileId, newName string) error {
	_, err, _ := a.request("https://api.alipan.com/v3/file/update", http.MethodPost, func(req *resty.Request) {
		req.SetBody(map[string]any{
			"check_name_mode": "refuse",
			"drive_id":        a.DriveId,
			"file_id":         fileId,
			"name":            newName,
		})
	}, nil)
	return err
}

func (a *Aliyun) MakeDir(parentFolderId, dirName string) error {
	_, err, _ := a.request("https://api.aliyundrive.com/adrive/v2/file/createWithFolders", http.MethodPost, func(req *resty.Request) {
		req.SetBody(map[string]any{
			"drive_id":        a.DriveId,
			"parent_file_id":  parentFolderId,
			"name":            dirName,
			"check_name_mode": "refuse",
			"type":            "folder",
		})
	}, nil)
	return err
}

func (a *Aliyun) Remove(fileId string) error {
	_, err, _ := a.request("https://api.aliyundrive.com/adrive/v4/batch", http.MethodPost, func(req *resty.Request) {
		req.SetBody(map[string]any{
			"requests": []map[string]any{
				{
					"body": map[string]any{
						"drive_id": a.DriveId,
						"file_id":  fileId,
					},
					"headers": map[string]any{
						"Content-Type": "application/json",
					},
					"id":     fileId,
					"method": "POST",
					"url":    "/recyclebin/trash",
				},
			},
			"resource": "file"})
	}, nil)
	return err
}
