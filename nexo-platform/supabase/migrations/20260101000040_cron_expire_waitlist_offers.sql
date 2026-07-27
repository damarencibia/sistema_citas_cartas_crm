SELECT cron.schedule(
  'expire-waitlist-offers',
  '* * * * *',
  $$SELECT expire_waitlist_offers()$$
);
