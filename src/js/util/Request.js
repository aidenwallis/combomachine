import keys from 'lodash/keys';

const defaultOptions = {
  baseUrl: '',
  headers: {
    Accept: 'application/json',
  },
};

/**
 * Simple request class
 * -------------------------
 * I could implement all methods, but this should cover everything we need,
 * feel free to implement if you need them. SeemsGood
 */
class Request {
  constructor(options = {}) {
    this.options = {...defaultOptions, ...options};
  }

  get(url, query = {}, headers = {}) {
    return fetch(this._buildUrl(url, query), {
      headers: {...this.options.headers, ...headers},
    }).then(resp => this._handleRes(resp));
  }

  post(url, body = {}, headers = {}) {
    return fetch(this._buildUrl(url, null), {
      method: 'POST',
      headers: {
        ...this.options.headers,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }).then(res => this._handleRes(res));
  }

  buildQuery(query) {
    return keys(query)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&');
  }

  _handleRes(res) {
    return this.options.json ? res.json() : res;
  }

  _buildUrl(url, query = {}) {
    const q = query ? this.buildQuery(query) : '';
    let res = this.options.baseUrl + url;
    if (q !== '') {
      res += (url.includes('?') ? '&' : '?') + q;
    }
    return res;
  }
}

export default Request;
