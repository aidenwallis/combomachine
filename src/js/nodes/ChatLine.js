import escape from 'lodash/escape';
import findLast from 'lodash/findLast';
import punycode from 'punycode';
import sdbmCode from '../util/sdbmCode';

const defaultColors = [
  '#e391b8', '#e091ce', '#da91de', '#c291db', '#ab91d9', '#9691d6', '#91a0d4', '#91b2d1', '#91c2cf',
  '#91ccc7', '#91c9b4', '#90c7a2', '#90c492', '#9dc290', '#aabf8f', '#b5bd8f', '#bab58f', '#b8a68e',
  '#b5998e', '#b38d8d',
];

const actionRx = /^\u0001ACTION (.*)\u0001$/;
const bitsRx = /^(\w+?)(\d+)$/;

class ChatLine {
  constructor(message, badges, thirdPartyEmotes, cheermotes) {
    this.message = message;
    this.badges = badges;
    this.thirdPartyEmotes = thirdPartyEmotes;
    this.cheermotes = cheermotes;

    this.comboing = false;

    // For removing messages with CLEARCHAT
    this.senderId = this.message.tags['user-id'];

    const action = actionRx.exec(message.params[1]);
    this.text = action ? action[1] : message.params[1];

    this.twitchEmotes = [];
    if (message.tags.emotes && message.tags.emotes !== true) {
      const emoteLists = message.tags.emotes.split('/');
      for (let i = 0; i < emoteLists.length; i++) {
        const [emoteId, _positions] = emoteLists[i].split(':');
        const positions = _positions.split(',');
        for (let j = 0; j < positions.length; j++) {
          const [start, end] = positions[j].split('-');
          this.twitchEmotes.push({
            start: parseInt(start, 10),
            end: parseInt(end, 10),
            id: emoteId,
          });
        }
      }
    }
    this.emotes = this.twitchEmotes.map(e => ({
      id: `twitch_${e.id}`,
      provider: 'twitch',
      url: `https://static-cdn.jtvnw.net/emoticons/v1/${e.id}/1.0`,
    }));

    this.node = document.createElement('div');
    this.node.className = 'chat-line';

    // Build badges
    this.badgeNode = document.createElement('span');
    this.badgeNode.className = 'chat-line-badges';
    this.node.appendChild(this.badgeNode);
    this._addBadges();

    // Build username
    this.nameNode = document.createElement('span');
    this.nameNode.className = 'chat-line-name';
    this.nameInnerNode = document.createElement('span');
    this.nameInnerNode.className = 'chat-line-name-inner';
    const username = this.message.prefix.split('!')[0];
    this.nameInnerNode.textContent = username;
    const color = message.tags.color && message.tags.color !== '' ?
      message.tags.color :
      defaultColors[sdbmCode(message.tags['user-id'] || username) % (defaultColors.length)];
    this.nameInnerNode.style.color = color;
    this.nameNode.appendChild(this.nameInnerNode);
    if (action === null) {
      this.nameColonNode = document.createElement('span');
      this.nameColonNode.className = 'chat-line-colon';
      this.nameColonNode.textContent = ': ';
      this.nameNode.appendChild(this.nameColonNode);
    }
    this.node.appendChild(this.nameNode);

    this.textNode = document.createElement('span');
    this.textNode.className = 'chat-line-text';
    if (action) {
      this.textNode.classList.add('chat-line-action');
      this.textNode.style.color = color;
    }
    this.textNode.innerHTML = this._renderText();
    this.node.appendChild(this.textNode);
  }

  getNode() {
    return this.node;
  }

  addCombo(size, emote) {
    if (!this.comboing) {
      this.senderId = null; // We don't want this to be deletable since we collapse this to a combo message.
      this.node.classList.add('chat-line-comboer');
      this.comboEmoteNode = document.createElement('img');
      this.comboEmoteNode.className = 'chat-line-emote chat-line-emote-combo-image';
      this.comboEmoteNode.src = emote.url;
      this.comboCounterNode = document.createElement('span');
      this.comboCounterNode.className = 'chat-line-combo-counter';

      this.comboCounterMultiplierNode = document.createElement('span');
      this.comboCounterMultiplierNode.className = 'chat-line-combo-counter-multiplier';
      this.comboCounterMultiplierNode.textContent = size;
      this.comboCounterNode.appendChild(this.comboCounterMultiplierNode);

      this.comboCounterTimesNode = document.createElement('span');
      this.comboCounterTimesNode.className = 'chat-line-combo-counter-times';
      this.comboCounterTimesNode.textContent = 'X';
      this.comboCounterNode.appendChild(this.comboCounterTimesNode);

      this.comboHitsNode = document.createElement('span');
      this.comboHitsNode.className = 'chat-line-combo-hits';
      this.comboHitsNode.textContent = 'HITS';

      // Empty the node of its current contents.
      while (this.node.firstChild) {
        this.node.removeChild(this.node.firstChild);
      }
      this.comboing = true;
      this.node.appendChild(this.comboEmoteNode);
      this.node.appendChild(this.comboCounterNode);
      this.node.appendChild(this.comboHitsNode);
    } else {
      this.comboCounterMultiplierNode.textContent = size;
    }

    this.comboCounterMultiplierNode.classList.remove('chat-line-combo-counter-multiplier-animated');
    void this.comboCounterMultiplierNode.offsetWidth;
    this.comboCounterMultiplierNode.classList.add('chat-line-combo-counter-multiplier-animated');

    console.log('Combo detected!');
  }

  _addBadges() {
    if (this.message.tags.badges && this.message.tags.badges !== true) {
      for (const b of this.message.tags.badges.split(',')) {
        const [name, version] = b.split('/');
        const badge = this.badges[name];
        if (badge) {
          const badgeData = badge.versions[version];
          if (badgeData) {
            const badgeShell = document.createElement('span');
            badgeShell.className = 'chat-badge';
            const badgeImg = document.createElement('img');
            badgeImg.className = 'chat-line-badge';
            badgeImg.src = badgeData.image_url_1x;
            badgeImg.height = 18;
            badgeShell.appendChild(badgeImg);
            this.badgeNode.appendChild(badgeShell);
          }
        }
      }
    }
  }

  _renderWord(word) {
    const emote = this.thirdPartyEmotes[word];
    if (emote) {
      this.emotes.push({
        id: `thirdparty_${emote}`,
        url: emote,
        provider: 'thirdparty',
      });
      return `<img src="${emote}" class="chat-line-emote chat-line-emote-${emote.id} chat-line-thirdparty-emote" title="${word}">`;
    }
    const bitMatch = bitsRx.exec(word);
    if (bitMatch && this.message.tags.bits) {
      const cheermote = this.cheermotes[bitMatch[1]];
      if (cheermote) {
        const amount = parseInt(bitMatch[2], 10);
        // find the correct tier
        const cheerTier = findLast(cheermote.tiers, tier => tier.minBits <= amount);
        return `<img class="chat-line-emote chat-line-cheermote chat-line-emote-${cheermote.name}" alt="${cheerTier.name}" title="${cheerTier.name}" src="${cheerTier.url}">`
          + `<span class="chat-line-cheer-amount" style="color: ${cheerTier.color}">${amount}</span>`;
      }
    }
    return escape(word);
  }

  _renderText() {
    let characterArray = punycode.ucs2.decode(this.text);
    for (let i = 0; i < characterArray.length; i++) {
      characterArray[i] = punycode.ucs2.encode([characterArray[i]]);
    }
    for (const emote of this.twitchEmotes) {
      const emoteName = characterArray.slice(emote.start, emote.end + 1).join('');
      characterArray[emote.start] = `<img class="chat-line-emote chat-line-emote-${emote.id} chat-line-twitch-emote" data-provider="twitch" title="${emoteName}" src="https://static-cdn.jtvnw.net/emoticons/v1/${emote.id}/1.0">`;
      for (let k = emote.start + 1; k <= emote.end; k++) {
        characterArray[k] = '';
      }
    }
    let word = '';
    let final = '';
    for (let i = 0; i < characterArray.length; i++) {
      if (characterArray[i] === undefined) {
        continue;
      } else if (characterArray[i] === ' ') {
        final += `${this._renderWord(word)} `;
        word = '';
      } else if (characterArray[i].length > 5) {
        final += `${this._renderWord(word)}`;
        final += characterArray[i];
        word = '';
      } else {
        word += characterArray[i];
      }
    }
    final += this._renderWord(word);
    return twemoji.parse(final);
  }
}

export default ChatLine;
