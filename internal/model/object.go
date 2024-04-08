package model

import (
	"ShareSubscription/internal/utils"
	"time"
)

type ObjWrapName struct {
	Name string
	Obj
}

func (o *ObjWrapName) Unwrap() Obj {
	return o.Obj
}

func (o *ObjWrapName) GetName() string {
	if o.Name == "" {
		o.Name = utils.MappingName(o.Obj.GetName())
	}
	return o.Name
}

type Object struct {
	ID       string
	Path     string
	Name     string
	Size     int64
	Modified time.Time
	Ctime    time.Time // file create time
	IsFolder bool
}

func (o *Object) GetName() string {
	return o.Name
}

func (o *Object) GetSize() int64 {
	return o.Size
}

func (o *Object) ModTime() time.Time {
	return o.Modified
}
func (o *Object) CreateTime() time.Time {
	if o.Ctime.IsZero() {
		return o.ModTime()
	}
	return o.Ctime
}

func (o *Object) IsDir() bool {
	return o.IsFolder
}

func (o *Object) GetID() string {
	return o.ID
}

func (o *Object) GetPath() string {
	return o.Path
}

func (o *Object) SetPath(path string) {
	o.Path = path
}
