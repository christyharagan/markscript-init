import {<%= databaseModel %>} from './build/databaseModel'
<% imports.forEach(function(i){ %>import {<%= i[0] %>} from '<%= i[1] %>'
<% }) %>
const COMMON = <%= common %>

export const build: MarkScript.Build = {
  buildConfig: <<%= _.reduce(configTypes, function(type, thisType) {return type + ' & ' + thisType}) %>>{
    databaseConnection: {
      host: COMMON.ml.host,
      httpPort: COMMON.ml.port,
      adminPort: 8001,
      configPort: 8002,
      user: COMMON.ml.user,
      password: COMMON.ml.password,
    },
    database: {
      modelObject: new <%= databaseModel %>(COMMON.appName, COMMON.ml.port, COMMON.ml.host)
    },
    <% Object.keys(config).forEach(function(key){ %><%= key %>: <%= config[key] %>,
    <% }) %>assetBaseDir: './src'
  },
  plugins: [<%= _.reduce(plugins, function(p, plugin) {return p + ', ' + plugin}) %>],
  runtime: Runtime,
  tasks: {}
}
