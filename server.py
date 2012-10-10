import os
import hashlib
import subprocess
import getpass
from functools import wraps
import argparse

from flask import (
    Flask, render_template, url_for, send_from_directory, request, jsonify,
    session, redirect, abort, 
    )


class Authenticator:
    def __init__(self, passwd=None):
        self.no_authenticate = False
        self.conns = 1
        if passwd:
            self.set_passwd(passwd)

    def set_passwd(self, passwd):
        self.hpass = self._hash_passwd(passwd)
        
    def addr(self, *args, **kwargs):
        ip = request.remote_addr
        if ip == '127.0.0.1':
            return
        if ip.startswith('192.168.'):
            return
        app.logger.warn('IP rules denied access from {0}'.format(ip))
        return abort(401)

    def _hash_passwd(self, passwd):
        m = hashlib.sha512()
        m.update(passwd)
        m.update(app.salt)
        return m.digest()

    def check_passwd(self, passwd):
        hpass_check = self._hash_passwd(passwd)
        return self.hpass == hpass_check

    def is_authenticated(self):
        if self.no_authenticate:
            return True
        return session.get('authenticated', None)

    def requires_auth(self, f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not self.is_authenticated():
                session['auth_return_url'] = request.url
                return redirect('/login')
            return f(*args, **kwargs)
        return decorated


parser = argparse.ArgumentParser()
parser.add_argument(
    '--debug', type=bool, default=False, help="IR codes")
parser.add_argument(
    '--run_process', type=bool, default=True, help="Run binary or don't")
parser.add_argument(
    'bin', help="binary path")
parser.add_argument(
    'ir_codes_dir', help="IR codes")

args = parser.parse_args()
binary_path = args.bin
recpath = args.ir_codes_dir

app = Flask(__name__)
app.debug = args.debug
app.secret_key = os.urandom(24)
app.salt = os.urandom(48 / 8)

authenticator = Authenticator()
app.before_request(authenticator.addr)
app.jinja_env.globals['_is_authenticated'] = authenticator.is_authenticated


process = None
if args.run_process:
    cmd = [binary_path, '-d', '/dev/cu.usbmodem00000001', '-i']
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'), 'favicon.ico',
        mimetype='image/vnd.microsoft.icon')


@app.route('/robots.txt')
def robots():
    return send_from_directory(
        os.path.join(app.root_path, 'static'), 'robots.txt',
        mimetype='txt/plain')


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


@app.route("/")
@authenticator.requires_auth
def root():
    return render_template('index.html')


@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    elif request.method == 'POST':
        if authenticator.conns <= 0:
            return abort(401)

        passwd = request.form.get('password')
        if authenticator.check_passwd(passwd):
            session['authenticated'] = True
            authenticator.conns -= 1
            return redirect(session.get('auth_return_url', '/'))
        else:
            return redirect('/login')


@app.route("/logout", methods=['GET', 'POST'])
@authenticator.requires_auth
def logout():
    if request.method == 'GET':
        return redirect('/login')
    if request.form.get('action', None) == 'Logout':
        session['authenticated'] = False
        authenticator.conns += 1
    return redirect('/')


@app.route("/cmd")
@authenticator.requires_auth
def cmds():
    return jsonify(cmds=sorted(os.listdir(recpath)))


@app.route("/cmd/<cmd>")
@authenticator.requires_auth
def cmd(cmd):
    if cmd.find(' ') > -1:
        cmd, arg = cmd.split(' ')
        arg = os.path.basename(arg)
        if process:
            process.stdin.write(cmd)
            process.stdin.write(' ')
            process.stdin.write(os.path.join(recpath, arg))
            process.stdin.write('\n')
    else:
        if cmd == 'q' or cmd == 'quit':
            return jsonify({'status': 'invalid command'})
        if process:
            process.stdin.write(cmd)
            process.stdin.write('\n')
    return jsonify({'status': 'ok'})


if __name__ == "__main__":
    try:
        passwd = getpass.getpass('Password for remote: ')
        authenticator.set_passwd(passwd)
        del passwd
        app.run(host='0.0.0.0', use_reloader=False)
    except KeyboardInterrupt:
        if process:
            print 'shutting down process...',
            process.stdin.write('q\n')
            process.stdin.close()
            process.communicate()
            print 'done'
