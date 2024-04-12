import requests
import json
from .config import get_config_value
from .auth import set_auth_header
import operator

class Database:

  def list(self, opts={}):
    params = {}
    if opts.get("mine"):
      params["onlyMine"] = True

    response = requests.get(
      f"{get_config_value('host')}/api/admin/database",
      params=params,
      headers=set_auth_header()
    )

    if response.status_code != 200:
      print(f"{response.status_code} Unable to list databases {response.text}")
      return

    response = response.json()

    if opts.get("json"):
      print(json.dumps(response, indent=2))
      return

    response = sorted(response, key=operator.itemgetter('database'))

    for db in response:
      print(f"{db['database']}")

  def set_metadata(self, name, metadata):
    response = requests.patch(
      f"{get_config_value('host')}/api/admin/database/{name['path']}/metadata",
      json=metadata,
      headers=set_auth_header()
    )

    if response.status_code != 200:
      print(f"{response.status_code} Unable to set database metadata {response.text}")
      return

    response = response.text
    print(f"Patched database {name['path']} metadata")