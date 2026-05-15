'use strict';

/**
 * Lambda@Edge origin-request function.
 *
 * Detects social media/search crawlers by User-Agent and routes
 * requests for /debate/* and /sitemap.xml to the Convex HTTP action
 * origin so they receive prerendered HTML with Open Graph tags.
 *
 * All other requests pass through to the S3 origin unchanged.
 */

const CONVEX_SITE_URL = 'CONVEX_SITE_URL_PLACEHOLDER';

const BOT_PATTERNS = [
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'WhatsApp',
  'Applebot',
  'Googlebot',
  'Bingbot',
  'baiduspider',
  'yandex',
  'DuckDuckBot',
  'Slurp',
  'redditbot',
  'ia_archiver',
  'SkypeUriPreview',
  'TelegramBot',
  'Pinterest',
  'Snapchat',
  'embedly',
  'Quora',
  'Showyou',
  'outbrain',
  'W3C_Validator',
  'curl',
  'wget',
  'python-requests',
  'Go-http-client',
];

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(function (pattern) {
    return ua.indexOf(pattern.toLowerCase()) !== -1;
  });
}

exports.handler = function (event, context, callback) {
  var request = event.Records[0].cf.request;
  var userAgent = '';

  if (request.headers['user-agent'] && request.headers['user-agent'].length > 0) {
    userAgent = request.headers['user-agent'][0].value;
  }

  var path = request.uri;

  var shouldRewrite = isBot(userAgent) && (
    path.indexOf('/debate/') === 0 ||
    path === '/sitemap.xml'
  );

  if (shouldRewrite) {
    request.origin = {
      custom: {
        domainName: CONVEX_SITE_URL,
        port: 443,
        protocol: 'https',
        path: '',
        sslProtocols: ['TLSv1.2'],
        readTimeout: 30,
        keepaliveTimeout: 5,
        customHeaders: {}
      }
    };

    request.headers['host'] = [{
      key: 'Host',
      value: CONVEX_SITE_URL
    }];
  }

  callback(null, request);
};
