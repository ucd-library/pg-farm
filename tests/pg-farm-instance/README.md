This docker compose file shows off the PG Farm Postgresql Instance Proxy.  To use, simply run `docker-compose up` and then connect to the database using the following connection string:

```
# psql -U postgres -h localhost
> CREATE USER [cas-username] WITH PASSWORD 'postgres';
```

Now, mint a token for the user and connect to the database using the token:

```
# export PGPASSWORD=[token]
# psql -U [cas-username] -h localhost
```

You should now be able to connect to the database using campus minted JWT token.