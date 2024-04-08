package db

import (
	"ShareSubscription/internal/conf"
	"ShareSubscription/internal/model"
	"fmt"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm/logger"
	stdlog "log"
	"strings"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func Init(d *gorm.DB) {
	db = d
	err := AutoMigrate(new(model.Subscription), new(model.SubscriptionLog))
	if err != nil {
		log.Fatalf("failed migrate database: %s", err.Error())
	}
}

func AutoMigrate(dst ...interface{}) error {
	err := db.AutoMigrate(dst...)
	return err
}

func GetDb() *gorm.DB {
	return db
}

func Close() {
	log.Info("closing db")
	sqlDB, err := db.DB()
	if err != nil {
		log.Errorf("failed to get db: %s", err.Error())
		return
	}
	err = sqlDB.Close()
	if err != nil {
		log.Errorf("failed to close db: %s", err.Error())
		return
	}
}

func InitDB() {
	logLevel := logger.Silent
	newLogger := logger.New(
		stdlog.New(log.StandardLogger().Out, "\r\n", stdlog.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)
	gormConfig := &gorm.Config{
		Logger: newLogger,
	}
	var dB *gorm.DB
	var err error

	dbFile := conf.Config.Database.DBFile
	if !(strings.HasSuffix(dbFile, ".db") && len(dbFile) > 3) {
		log.Fatalf("db name error.")
	}
	dB, err = gorm.Open(sqlite.Open(fmt.Sprintf("%s?_journal=WAL&_vacuum=incremental",
		dbFile)), gormConfig)

	if err != nil {
		log.Fatalf("failed to connect database:%s", err.Error())
	}
	Init(dB)
}
