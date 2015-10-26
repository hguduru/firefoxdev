#!/usr/bin/python

import json
import os
import sqlite3
import sys
import time
from urlparse import urlparse
import argparse
import subprocess

profile_dir = "temp_profile"
db_filename = "privbrowse_addon_logging3.sqlite"
db_print = True

def clear_database():
    conn = sqlite3.connect("%s/%s" % (profile_dir, db_filename))
    conn.execute("DELETE FROM logging_first_party2")
    conn.execute("DELETE FROM logging_third_party2")
    conn.commit()

def retrieve_screenshot():
    conn = sqlite3.connect("%s/%s" % (profile_dir, db_filename))
    c = conn.cursor()
    c.execute('SELECT thumbnail FROM logging_first_party2')
    # c.execute('SELECT thumbnail FROM logging_first_party2 WHERE url = ?', (url, ))
    screen = c.fetchall()
    conn.close()
    return json.dumps(screen)

def retrieve_third_parties():
    if not db_print:
        return "%s/%s" % (profile_dir, db_filename)
    conn = sqlite3.connect("%s/%s" % (profile_dir, db_filename))
    c = conn.cursor()
    c.execute('SELECT * FROM logging_third_party2')
    # c.execute('SELECT thumbnail FROM logging_first_party2 WHERE url = ?', (url, ))
    thirdvalues = c.fetchall()
    third_db = json.dumps(thirdvalues)
    c.execute('SELECT * FROM logging_first_party2')
    # c.execute('SELECT thumbnail FROM logging_first_party2 WHERE url = ?', (url, ))
    firstvalues = c.fetchall()
    first_db = json.dumps(firstvalues)
    conn.close()
    return {
        "third" : json.loads(third_db),
        "first" : json.loads(first_db)
    }

def main(args):
    global db_print
    db_print = not args.db_print
    urls = []
    url_filename = "data/performance_urls.json"

    url = args.url
    urls = [url] if args.url is not None else []
    if args.url_file:
        urls += json.load(sys.stdin)

    if (os.path.exists(profile_dir)):
        clear_database()

    with open(url_filename, 'w') as url_file:
        json.dump(urls, url_file)

    FNULL = open(os.devnull, 'w')
    subprocess.call(["bash", "run_performance.sh", "--profiledir=" + profile_dir], stdout=FNULL, stderr=subprocess.STDOUT)
    
    if args.third_parties:
        ans = retrieve_third_parties()
    else:
        ans = retrieve_screenshot(url)
    print(ans)

if __name__=='__main__':
    parser = argparse.ArgumentParser(description="generate screen shots from url")
    parser.add_argument("--url", help="Target url", default=None)
    parser.add_argument("--url-file", help="Read json list of urls from stdin. ", action="store_true")
    parser.add_argument("--third-parties", action="store_true",
                        help="Print the third parties on the website. ")
    parser.add_argument("--db-print", action="store_true", help="Don't output entire db, just print location of outfile. ")
    args = parser.parse_args()
    main(args)
    
