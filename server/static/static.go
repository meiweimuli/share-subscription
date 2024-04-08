package static

import (
	"ShareSubscription/public"
	"fmt"
	log "github.com/sirupsen/logrus"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

var static fs.FS

func initStatic() {
	dist, err := fs.Sub(public.Public, "dist")
	if err != nil {
		log.Fatalf("failed to read dist dir")
	}
	static = dist
	return
}

func Static(r *gin.RouterGroup, noRoute func(handlers ...gin.HandlerFunc)) {
	initStatic()
	folders := []string{"assets", "images", "static"}
	r.Use(func(c *gin.Context) {
		for i := range folders {
			if strings.HasPrefix(c.Request.RequestURI, fmt.Sprintf("/web/%s/", folders[i])) {
				c.Header("Cache-Control", "public, max-age=15552000")
			}
		}
	})
	r.StaticFS("/web/", http.FS(static))
	noRoute(func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/web/")
	})
}
