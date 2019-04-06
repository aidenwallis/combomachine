import ThirdPartyService from './services/ThirdParty';
import TwitchIRCConnection from './util/TwitchIRCConnection';
import TwitchService from './services/Twitch';
import ChatLine from './nodes/ChatLine';

class App {
  constructor(node) {
    this.badges = {};
    this.cheermotes = {};
    this.emotes = {};
    this.connection = new TwitchIRCConnection();
    this.connection.on('PRIVMSG', (m) => this._newMessage(m));
    this.connection.on('CLEARCHAT', (m) => this._newClearchat(m));
    this.connection.on('CLEARMSG', (m) => this._newClearmsg(m));

    this.currentEmotes = null;
    this.currentCombo = null;
    this.comboNode = null;
    this.comboSize = 0;

    this.node = node;
    this.lines = [];
  }

  start(channelName) {
    return TwitchService.getChannel(channelName)
      .then((channel) => {
        if (!channel) {
          window.location = '/';
        }
        return channel;
      })
      .then((channel) => {
        this.connection.setChannel(channel.login);
        return this._fetchData(channel);
      })
      .then(() => {
        this.connection.connect();

      }).catch(e => console.error(e));
  }

  _fetchData(channel) {
    return Promise.all([
      TwitchService.getBadges(channel.id),
      TwitchService.getCheermotes(channel.id),
      ThirdPartyService.getEmotes(channel.login, channel.id),
    ]).then(([badges, cheermotes, emotes]) => {
      this.badges = badges;
      this.cheermotes = cheermotes;
      this.emotes = emotes;
      return;
    });
  }

  _newMessage(message) {
    const chatline = new ChatLine(message, this.badges, this.emotes, this.cheermotes);
    // First message, set the current emotes!
    if (this.currentEmotes === null) {
      this._addLine(chatline);
      return;
    }

    // If a combo is already in progress, can we add to it or reset it?
    if (this.comboSize > 0) {
      const anotherCombo = chatline.emotes.find(e => e.id === this.currentCombo.id);
      if (!anotherCombo) {
        this.currentEmotes = chatline.emotes;
        this.currentCombo = null;
        this.comboSize = 0;
        this._addLine(chatline);
        return;
      }
      // Another combo!
      this.comboSize++;
      this.comboNode.addCombo(this.comboSize, this.currentCombo);
      return;
    }

    // Try and find something to combo
    let comboEmote;
    for (const emote of chatline.emotes) {
      const foundEmote = this.currentEmotes.find(e => e.id === emote.id);
      if (foundEmote) {
        comboEmote = foundEmote;
        break;
      }
    }

    if (comboEmote) {
      this.comboNode = this.lines[this.lines.length - 1];
      this.currentCombo = comboEmote;
      this.comboSize = 2;
      this.comboNode.addCombo(this.comboSize, this.currentCombo);
      return;
    }

    this.currentEmotes = chatline.emotes;
    this._addLine(chatline);
  }

  _addLine(chatline) {
    this.lines.push(chatline);
    this.node.appendChild(chatline.getNode());
    this._scroll();
    this.currentEmotes = chatline.emotes;
  }

  _scroll() {
    const MAX_MSG_LENGTH = 30;
    const childLength = this.node.children.length;
    if (childLength > MAX_MSG_LENGTH) {
      const toRemove = childLength - MAX_MSG_LENGTH;
      for (let i = 0; i < toRemove; ++i) {
        this.node.removeChild(this.node.childNodes[0]);
        this.lines.shift();
      }
    }
    this.node.scrollTop = this.node.scrollHeight * 2;
  }

  _newClearchat(message) {
    for (let i = 0; i < this.lines.length;) {
      const line = this.lines[i];
      if (line.senderId === message.tags['target-user-id']) {
        line.getNode().remove();
        this.lines.splice(i, 1);
        continue;
      }
      ++i;
    }
  }

  _newClearmsg(message) {
    for (let i = 0; i < this.lines.length; ++i) {
      const line = this.lines[i];
      if (line.msgId === message.tags['target-msg-id']) {
        line.getNode().remove();
        this.lines.splice(i, 1);
        return;
      }
    }
  }
}

export default App;
