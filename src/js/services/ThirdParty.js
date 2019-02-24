import keys from 'lodash/keys';
import Request from '../util/Request';
const req = new Request({json: true});

class ThirdPartyService {
  static getGlobalFfzEmotes() {
    return req.get('https://api.frankerfacez.com/v1/set/global')
      .then((res) => {
        const emoticons = {};
        for (const set of res.default_sets) {
          if (set.emoticons) {
            for (const emote of set.emoticons) {
              emoticons[emote.name] = emote.urls[Math.min(...keys(emote.urls))];
            }
          }
        }
        return emoticons;
      })
      .catch(() => ({}));
  }

  static getChannelFfzEmotes(channelID) {
    return req.get(`https://api.frankerfacez.com/v1/room/id/${channelID}`)
      .then((res) => {
        const emoticons = {};
        const set = res.sets[res.room.set];
        if (set.emoticons) {
          for (const emote of set.emoticons) {
            emoticons[emote.name] = emote.urls[Math.min(...keys(emote.urls))];
          }
        }
        return emoticons;
      })
      .catch(() => ({}));
  }

  static getGlobalBttvEmotes() {
    return req.get('https://api.betterttv.net/2/emotes')
      .then((res) => {
        return res.reduce((acc, cur) => {
          acc[cur.code] = res.urlTemplate.replace('{{id}}', cur.id).replace('{{image}}', '1x');
          return acc;
        }, {});
      })
      .catch(e => {
        console.error(e);
        return {};
      });
  }

  static getChannelBttvEmotes(channel) {
    return req.get(`https://api.betterttv.net/2/channels/${channel}`)
      .then((res) => {
        return res.emotes.reduce((acc, cur) => {
          acc[cur.code] = res.urlTemplate.replace('{{id}}', cur.id).replace('{{image}}', '1x');
          return acc;
        }, {});
      })
      .catch(() => ({}));
  }

  static getEmotes(c, id) {
    const channel = encodeURIComponent(c);
    return Promise.all([
      ThirdPartyService.getGlobalFfzEmotes(),
      ThirdPartyService.getChannelFfzEmotes(id),
      ThirdPartyService.getGlobalBttvEmotes(),
      ThirdPartyService.getChannelBttvEmotes(channel),
    ]).then(([a, b, c, d]) => {
      return {...a, ...b, ...c, ...d};
    });
  }
}

export default ThirdPartyService;
