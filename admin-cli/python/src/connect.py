from .config import get_config_value, get_decoded_jwt
from urllib.parse import urlparse
from urllib.parse import quote_plus
import json
import base64

class Connect:

  def getConnectionData(self, dbname):
    password = get_config_value("tokenHash", '[token]')
    jwt = get_decoded_jwt()

    username = '[username]'
    if jwt:
      username = jwt.get('preferred_username')
      if username is None:
        username = jwt.get('username')

    host = get_config_value("host")
    if host is not None:
      host = urlparse(host).hostname
    else:
      host = 'pgfarm.library.ucdavis.edu'

    if dbname is None:
      dbname = '[dbname]'

    return {
      'host': host,
      'dbname': dbname,
      'port': 5432,
      'password': password,
      'user': username
    }
  
  def json(self, dbname=None):
    print(json.dumps(self.getConnectionData(dbname), indent=2))

  def yaml(self, dbname=None):
    data = self.getConnectionData(dbname)
    print(f"host: {data['host']}")
    print(f"port: {data['port']}")
    print(f"dbname: {data['dbname']}")
    print(f"user: {data['user']}")
    print(f"password: {data['password']}")

  def psql(self, dbname=None, pass_prompt=False, pgservice=False, str_version=False):
    data = self.getConnectionData(dbname)

    if str_version:
      if pgservice:
        print(f"psql \"service=pgfarm dbname={data['dbname']}\"")
        return
      if pass_prompt is False:
        print(f"psql \"host={data['host']} port={data['port']} user={data['user']} dbname={data['dbname']} password={data['password']}\"")
        return
      print(f"psql \"host={data['host']} port={data['port']} user={data['user']} dbname={data['dbname']}\"")
      return

    if pgservice:
      print(f"PGSERVICE=pgfarm psql -d {data['dbname']}")
      return
    
    if pass_prompt is False:
      print(f"PGPASSWORD=\"{data['password']}\" psql -h {data['host']} -p {data['port']} -U {data['user']} -d {data['dbname']}")
      return
    
    print(f"psql -h {data['host']} -p {data['port']} -U {data['user']} -d {data['dbname']}")

  def uri(self, dbname=None):
    data = self.getConnectionData(dbname)

    user = quote_plus(data['user'])


    
    if data['password'] != '[token]':
      password = quote_plus(data['password'])
    
    if dbname != '[dbname]':
      dbname = quote_plus(data['dbname'])

    print(f"postgresql://{user}:{password}@{data['host']}:{data['port']}/{dbname}")