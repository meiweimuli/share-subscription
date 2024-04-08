package model

import "time"

type Subscription struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	Name            string     `json:"name"`
	Disabled        bool       `json:"disabled"`
	ShareUrl        string     `json:"share_url"`
	ShareSecret     string     `json:"share_secret"`
	TargetFolderId  string     `json:"target_folder_id"`
	MatchRegex      string     `json:"match_regex"`
	RenameRegex     string     `json:"replace_regex"`
	RenameTarget    string     `json:"rename_target"`
	IgnoreSameName  bool       `json:"ignore_same_name"`
	SavedFileIds    string     `json:"saved_file_ids"`
	LastQueryTime   *time.Time `json:"last_query_time"`
	ShareUrlInvalid bool       `json:"share_url_invalid"`
}

type SubscriptionLog struct {
	ID      uint       `json:"id" gorm:"primaryKey"`
	Message string     `json:"message"`
	LogTime *time.Time `json:"log_time"`
}
