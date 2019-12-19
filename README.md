
# Streaming notes

https://scalegrid.io/blog/getting-started-with-postgresql-streaming-replication/

https://www.postgresql.org/docs/12/warm-standby.html#STANDBY-SERVER-OPERATION

# DB Types

 - Streaming Replicate
 - Nightly Replicate
 - Standalone

# Streaming replication
 - Entire DB replicated
 - PGR roles need to be added on Master
 - DB config modifications required

# Nightly Replication
 - Need sync mechanism
 - Can limit to certain tables (white/black list)

# Standalone
 - Access control to psql