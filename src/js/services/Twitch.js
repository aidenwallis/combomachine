import map from 'lodash/map';
import sortBy from 'lodash/sortBy';

import config from '../../../config.json';
import Request from '../util/Request';

const badgeReq = new Request({
  baseUrl: 'https://badges.twitch.tv/v1/badges/',
  json: true,
  headers: {'Client-ID': config.clientId},
});

const krakenReq = new Request({
  baseUrl: 'https://api.twitch.tv/kraken/',
  json: true,
  headers: {
    Accept: 'application/vnd.twitchtv.v5+json',
    'Client-ID': config.clientId,
  },
});

const helixReq = new Request({
  baseUrl: 'https://api.twitch.tv/helix/',
  json: true,
  headers: {
    Accept: 'application/json',
    'Client-ID': config.clientId,
  },
});

class TwitchService {
  static getGlobalBadges() {
    return TwitchService._badgeRequest('global');
  }

  static getChannelBadges(channelID) {
    return TwitchService._badgeRequest(`channels/${channelID}`);
  }

  static getBadges(channelID) {
    return Promise.all([
      TwitchService.getGlobalBadges(),
      TwitchService.getChannelBadges(channelID),
    ])
      .then(([a, b]) => ({...a, ...b}))
      .catch(() => ({}));
  }

  static getChannel(login) {
    return helixReq.get('users', {login})
      .then((res) => res.data && res.data[0] ? res.data[0] : null)
      .catch(() => null);
  }

  static getCheermotes(channelID) {
    return krakenReq.get(`bits/actions?channel_id=${channelID}`)
      .then((res) => {
        return res.actions.reduce((acc, cheermote) => {
          const scale = Math.min(...cheermote.scales.map(s => parseInt(s, 10)));
          const background = 'dark';
          const state = 'animated';
          const cheerObj = {
            name: cheermote.prefix,
            id: cheermote.prefix.toLowerCase(),
            tiers: sortBy(map(cheermote.tiers, tier => ({
              name: `${cheermote.prefix} ${tier.min_bits}`,
              minBits: tier.min_bits,
              url: tier.images[background][state][scale],
              color: tier.color
            })), 'minBits'),
          };
          acc[cheerObj.id] = cheerObj;
          return acc;
        });
      })
      .catch(() => ({}));
  }

  static _badgeRequest(resource) {
    return badgeReq.get(`${resource}/display?language=en`)
      .then((res) => res && res.badge_sets ? res.badge_sets : {})
      .catch(() => ({}));
  }
}

export default TwitchService;
