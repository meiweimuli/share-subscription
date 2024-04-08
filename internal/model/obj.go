package model

import (
	"time"
)

type Obj interface {
	GetSize() int64
	GetName() string
	ModTime() time.Time
	CreateTime() time.Time
	IsDir() bool

	GetID() string
}
