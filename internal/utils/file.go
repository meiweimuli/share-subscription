package utils

import (
	"ShareSubscription/internal/conf"
	"fmt"
	"io"
	"mime"
	"os"
	"path"
	"path/filepath"
	"strings"

	log "github.com/sirupsen/logrus"
)

// CopyFile File copies a single file from src to dst
func CopyFile(src, dst string) error {
	var err error
	var srcfd *os.File
	var dstfd *os.File
	var srcinfo os.FileInfo

	if srcfd, err = os.Open(src); err != nil {
		return err
	}
	defer srcfd.Close()

	if dstfd, err = CreateNestedFile(dst); err != nil {
		return err
	}
	defer dstfd.Close()

	if _, err = io.Copy(dstfd, srcfd); err != nil {
		return err
	}
	if srcinfo, err = os.Stat(src); err != nil {
		return err
	}
	return os.Chmod(dst, srcinfo.Mode())
}

// CopyDir Dir copies a whole directory recursively
func CopyDir(src, dst string) error {
	var err error
	var fds []os.DirEntry
	var srcinfo os.FileInfo

	if srcinfo, err = os.Stat(src); err != nil {
		return err
	}
	if err = os.MkdirAll(dst, srcinfo.Mode()); err != nil {
		return err
	}
	if fds, err = os.ReadDir(src); err != nil {
		return err
	}
	for _, fd := range fds {
		srcfp := path.Join(src, fd.Name())
		dstfp := path.Join(dst, fd.Name())

		if fd.IsDir() {
			if err = CopyDir(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		} else {
			if err = CopyFile(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		}
	}
	return nil
}

// SymlinkOrCopyFile symlinks a file or copy if symlink failed
func SymlinkOrCopyFile(src, dst string) error {
	if err := CreateNestedDirectory(filepath.Dir(dst)); err != nil {
		return err
	}
	if err := os.Symlink(src, dst); err != nil {
		return CopyFile(src, dst)
	}
	return nil
}

// Exists determine whether the file exists
func Exists(name string) bool {
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

// CreateNestedDirectory create nested directory
func CreateNestedDirectory(path string) error {
	err := os.MkdirAll(path, 0700)
	if err != nil {
		log.Errorf("can't create folder, %s", err)
	}
	return err
}

// CreateNestedFile create nested file
func CreateNestedFile(path string) (*os.File, error) {
	basePath := filepath.Dir(path)
	if err := CreateNestedDirectory(basePath); err != nil {
		return nil, err
	}
	return os.Create(path)
}

var (
	VideoTypes = []string{"mp4", "mkv", "avi", "mov", "rmvb", "webm", "flv", "m3u8"}
	ImageTypes = []string{"jpg", "tiff", "jpeg", "png", "gif", "bmp", "svg", "ico", "swf", "web"}
	AudioTypes = []string{"mp3", "flac", "ogg", "m4a", "wav", "opus", "wma"}
	TextTypes  = []string{"txt", "htm", "html", "xml", "java", "properties", "sql", "js", "md", "json", "conf", "ini", "vue", "php", "py", "bat", "gitignore", "yml", "go", "sh", "c", "cpp", "h", "hpp", "tsx", "vtt", "srt", "ass", "rs", "lrc"}
)

// GetFileType get file type
func GetFileType(filename string) int {
	ext := strings.ToLower(Ext(filename))
	if SliceContains(AudioTypes, ext) {
		return conf.AUDIO
	}
	if SliceContains(VideoTypes, ext) {
		return conf.VIDEO
	}
	if SliceContains(ImageTypes, ext) {
		return conf.IMAGE
	}
	if SliceContains(TextTypes, ext) {
		return conf.TEXT
	}
	return conf.UNKNOWN
}

func GetObjType(filename string, isDir bool) int {
	if isDir {
		return conf.FOLDER
	}
	return GetFileType(filename)
}

var extraMimeTypes = map[string]string{
	".apk": "application/vnd.android.package-archive",
}

func GetMimeType(name string) string {
	ext := path.Ext(name)
	if m, ok := extraMimeTypes[ext]; ok {
		return m
	}
	m := mime.TypeByExtension(ext)
	if m != "" {
		return m
	}
	return "application/octet-stream"
}

const (
	KB = 1 << (10 * (iota + 1))
	MB
	GB
	TB
)
