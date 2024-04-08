package conf

import (
	"fmt"
	"gopkg.in/ini.v1"
	"os"
	"path"
)

var configFile = "data/conf.ini"

type serverConfig struct {
	Addr  string `ini:"addr"`
	Path  string `ini:"path"`
	Token string `ini:"token"`
}

type aliyunConfig struct {
	RefreshToken string `ini:"refreshToken"`
	AccessToken  string `ini:"accessToken"`
}

type databaseConfig struct {
	DBFile string `ini:"dbFile"`
}

type config struct {
	Sever    serverConfig   `ini:"server"`
	Database databaseConfig `ini:"database"`
	Aliyun   aliyunConfig   `ini:"aliyun"`
}

var Config *config

var defaultConfig = config{
	Sever: serverConfig{
		Addr:  ":9999",
		Path:  "/",
		Token: "12345678",
	},
	Database: databaseConfig{
		DBFile: "data/data.db",
	},
}

func Init() error {

	envConfigFile, ok := os.LookupEnv("CONFIG_FILE")
	if ok {
		configFile = envConfigFile
	}

	Config = &config{}

	if _, err := os.Stat(configFile); err != nil && os.IsNotExist(err) {

		Config = &defaultConfig

		if envServerAddr, ok := os.LookupEnv("SERVER_ADDR"); ok {
			Config.Sever.Addr = envServerAddr
		}
		if envServerToken, ok := os.LookupEnv("SERVER_TOKEN"); ok {
			Config.Sever.Token = envServerToken
		}
		if envAliyunRefreshToken, ok := os.LookupEnv("ALIYUN_REFRESH_TOKEN"); ok {
			Config.Aliyun.RefreshToken = envAliyunRefreshToken
		}

		dir := path.Dir(configFile)
		err = os.MkdirAll(dir, os.ModePerm)
		if err != nil {
			return err
		}
		_, err = os.Create(configFile)
		if err != nil {
			return err
		}

		cfg := ini.Empty()
		err = ini.ReflectFrom(cfg, Config)
		if err != nil {
			return err
		}
		err = cfg.SaveTo(configFile)
		if err != nil {
			return err
		}
	} else {
		err = ini.MapTo(Config, configFile)
		if err != nil {
			return err
		}
	}
	return nil
}

func Update() {
	cfg := ini.Empty()
	err := ini.ReflectFrom(cfg, Config)
	if err != nil {
		fmt.Println("ReflectFrom failed: ", err)
		return
	}

	err = cfg.SaveTo(configFile)
	if err != nil {
		fmt.Println("SaveTo failed: ", err)
		return
	}
}
