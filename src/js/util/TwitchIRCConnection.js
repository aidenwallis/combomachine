import EventEmitter from 'eventemitter3';
import ircMessage from 'irc-message';

const rx = /\r?\n/g;
const rx2 = /\s/g;

class TwitchIRCConnection extends EventEmitter {
  constructor(address = 'wss://irc-ws.chat.twitch.tv/') {
    super();

    this.connected = false;
    this.interval = null;
    this.channel = null;
    this.client = null;
    this.address = address;
  }

  connect() {
    if (!this.interval) {
      this.interval = setInterval(() => this._attemptConnection(), 2000);
    }
  }

  setChannel(channel) {
    this.channel = channel;
    if (this.connected) {
      this.client.send(`JOIN #${this.channel}`);
    }
  }

  _attemptConnection() {
    if (this.connected) {
      this._onConnect();
      return;
    }
    this.client = new WebSocket(this.address);
    this.client.onopen = () => {
      this.connected = true;
      this._onConnect();

      this.client.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
      this.client.send('PASS oauth:1231231');
      this.client.send('NICK justinfan123');
      if (this.channel) {
        this.client.send(`JOIN #${this.channel}`);
      }

      console.log('Connected to Twitch!');
    };
    this.client.onmessage = (e) => {
      const lines = e.data.split(rx);
      for (const line of lines) {
        if (line.replace(rx2, '') === '') {
          continue;
        }
        const parsed = ircMessage.parse(line);
        if (parsed.command === 'PING') {
          this.client.send('PONG');
          return;
        }
        this.emit(parsed.command, parsed);
      }
    };
    this.client.onerror = () => {
      if (!this.interval) {
        this.connected = false;
        this.client.close();
      }
      this.connect();
    };
  }

  _onConnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.emit('connect');
  }
}

export default TwitchIRCConnection;
