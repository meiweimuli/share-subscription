package db

import (
	"fmt"
)

func columnName(name string) string {
	return fmt.Sprintf("`%s`", name)
}
