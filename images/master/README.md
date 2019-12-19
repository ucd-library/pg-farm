Master Node Config


postgresql.conf
```
# Possible values are replica|minimal|logical
wal_level = replica
# required for pg_rewind capability when standby goes out of sync with master
wal_log_hints = on
# sets the maximum number of concurrent connections from the standby servers.
max_wal_senders = 3
# The below parameter is used to tell the master to keep the minimum number of
# segments of WAL logs so that they are not deleted before standby consumes them.
# each segment is 16MB
wal_keep_segments = 8
# The below parameter enables read only connection on the node when it is in
# standby role. This is ignored when the server is running as master.
hot_standby = on
```

In pg_hba.conf, the replication user will need access as well:

```
host    replication     all             127.0.0.1/32            trust
```