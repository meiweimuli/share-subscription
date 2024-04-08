package utils

import "time"

type Cron struct {
	delay time.Duration
	d     time.Duration
	ch    chan struct{}
}

func NewCron(d time.Duration) *Cron {
	return &Cron{
		d:  d,
		ch: make(chan struct{}),
	}
}

func NewDelayCron(d time.Duration, delay time.Duration) *Cron {
	return &Cron{
		delay: delay,
		d:     d,
		ch:    make(chan struct{}),
	}
}

func (c *Cron) Do(f func()) {
	go func() {
		if c.delay > 0 {
			<-time.After(c.delay)
		}
		ticker := time.NewTicker(c.d)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				f()
			case <-c.ch:
				return
			}
		}
	}()
}

func (c *Cron) Stop() {
	select {
	case _, _ = <-c.ch:
	default:
		c.ch <- struct{}{}
		close(c.ch)
	}
}
