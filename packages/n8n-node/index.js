'use strict';

const { MetaScrub } = require('./dist/nodes/MetaScrub/MetaScrub.node');

module.exports = {
  nodeTypes: {
    MetaScrub: {
      type: MetaScrub,
      sourcePath: require.resolve('./dist/nodes/MetaScrub/MetaScrub.node'),
    },
  },
};
