import * as gulp from 'gulp'
import * as path from 'path'
import * as inquirer from 'inquirer'
import * as os from 'os'
import * as fs from 'fs'
import {Common, Model} from './model'
let install = require('gulp-install')
let conflict = require('gulp-conflict')
let template = require('gulp-template')

const U_SERVICES = 'uServices'
const FILE_SERVER = 'File Server'
const SEMANTICS = 'Semantics'

interface Answers extends inquirer.Answers {
  appName: string
  hostName: string
  features: string[]
  language: string
  create: string[]
  httpPort: string
}

export function init() {
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      { type: 'input', name: 'appName', message: 'The name of the application', default: path.basename(process.cwd()).replace(/ /g, '_') },
      { type: 'input', name: 'hostName', message: 'The hostname of the MarkLogic server (leave blank for system hostname)', default: os.hostname().toLowerCase() },
      { type: 'checkbox', name: 'features', message: 'Which features should be included?', choices: [{name: U_SERVICES, checked: true }, { name: FILE_SERVER, checked: true }, { name: SEMANTICS, checked: true}]},
      // TODO: Support JavaScript
      //{ type: 'list', name: 'language', message: 'The language to use', choices: ['TypeScript', 'JavaScript'] },
      { type: 'checkbox', name: 'create', message: 'Which database components should be created?', choices: [{ name: 'HTTP Server', checked: true }, { name: 'Content Database', checked: true }, { name: 'Modules Database', checked: true }, { name: 'Schema Database', checked: true }, { name: 'Triggers Database', checked: true }] },
      {
        type: 'input', name: 'httpPort', message: 'The port of the new HTTP server', default: 8010, when: function(answers) {
          let create = <string[]>answers['create']
          return create.indexOf('HTTP Server') >= 0
        }
      }
    ], function(answers: Answers) {
      answers.appName = answers.appName.replace(/ /g, '')
      let features:{[feature:string]:boolean} = {}
      answers.features.forEach(function(feature){
        features[feature] = true
      })
      let imports: [string, string][] = [['basicBuildPlugin', 'markscript-basic-build']]
      let plugins: string[] = ['basicBuildPlugin']
      let configTypes: string[] = ['MarkScript.BuildConfig', 'MarkScript.BasicBuildConfig']
      let common: Common & { koa?: any } = {
        appName: answers.appName,
        ml: {
          host: answers.hostName,
          user: 'admin',
          password: 'admin',
          port: answers.httpPort ? parseInt(answers.httpPort) : 8000
        }
      }
      let packageJSON = {
        name: answers.appName,
        version: '0.0.0',
        dependencies: {
          'marklogic-typescript-definitions': '^0.3.1',
          'markscript-basic': '^0.2.0'
        },
        'devDependencies': {
          'markscript-basic-build': '^0.2.0',
          'markscript-core': '^0.6.0'
        }
      }
      let srcTSConfig = {
        compilerOptions: {
          target: 'es6',
          outDir: '..',
          moduleResolution: 'node'
        },
        formatCodeOptions: {
          indentSize: 2,
          tabSize: 2
        },
        filesGlob: [
          '../api.d.ts',
          './**/*.ts',
          '../node_modules/*/model.d.ts',
          '../node_modules/marklogic-typescript-definitions/ts/index.d.ts'
        ],
        compileOnSave: false,
        files: [
          '../api.d.ts',
          '../node_modules/markscript-core/model.d.ts',
          '../node_modules/marklogic-typescript-definitions/ts/index.d.ts'
        ]
      }
      let buildTSConfig = {
        compilerOptions: {
          target: 'es6',
          moduleResolution: 'classic'
        },
        formatCodeOptions: {
          indentSize: 2,
          tabSize: 2
        },
        compileOnSave: false,
        filesGlob: [
          'api.d.ts',
          'markscriptfile.ts',
          'build/*.ts',
          'test/*.ts',
          'typings/**/*.d.ts',
          'node_modules/markscript-core/model.d.ts',
          'node_modules/*/build.d.ts'
        ],
        files: [
          'api.d.ts',
          'markscriptfile.ts',
          'build/databaseModel.ts',
          'node_modules/markscript-basic-build/build.d.ts',
          'node_modules/markscript-core/model.d.ts',
          'node_modules/markscript-core/build.d.ts'
        ]
      }
      let config: { [key: string]: string } = {
      }

      if (features[U_SERVICES]) {
        imports.push(['uServicesPlugin', 'markscript-uservices-build'])
        plugins.push('uServicesPlugin')
        configTypes.push('MarkScript.UServicesBuildConfig')
        packageJSON['dependencies']['markscript-uservices'] = '^0.6.0'
        packageJSON['devDependencies']['markscript-uservices-build'] = '^0.1.2'
        srcTSConfig.files.push('../node_modules/markscript-uservices/model.d.ts')
        buildTSConfig.files.push('node_modules/markscript-uservices-build/build.d.ts', 'node_modules/markscript-koa/build.d.ts')
      }

      if (features[FILE_SERVER]) {
        config['fileServerPath'] = '\'./www\''
        if (!fs.existsSync(path.join(process.cwd(), 'www'))) {
          fs.mkdirSync(path.join(process.cwd(), 'www'))
        }
      }

      if (features[U_SERVICES] || features[FILE_SERVER]) {
        common.koa = {
          host: answers.hostName,
          port: 8080
        }
        config['middle'] = `{
          host: COMMON.koa.host,
          port: COMMON.koa.port
        }`
        imports.push(['Runtime', 'markscript-koa'])
        configTypes.push('MarkScript.KoaBuildConfig')
        packageJSON['dependencies']['markscript-koa'] = '^0.5.0'
      } else {
        imports.push(['Runtime', 'markscript-basic-build'])
      }

      if (features[SEMANTICS]) {
        packageJSON.dependencies['speckle'] = '^0.2.0'
        buildTSConfig.filesGlob.push('node_modules/speckle/speckle.d.ts')
        buildTSConfig.files.push('node_modules/speckle/speckle.d.ts')
      }

      function cleanAppName() {
        let appName = answers.appName.charAt(0).toUpperCase()
        let wasDash = false
        for (let i = 1; i < appName.length; i++) {
          if (answers.appName.charAt(i) === '-') {
            wasDash === true
          } else {
            if (wasDash) {
              appName += answers.appName.substring(i, 1).toUpperCase()
            } else {
              appName += answers.appName.substring(i, 1)
            }
            wasDash = false
          }
        }
        return appName
      }

      let model: Model = {
        appName: answers.appName,
        databaseModel: cleanAppName() + 'Database',
        hasServer: answers.create.indexOf('HTTP Server') >= 0,
        hasContentDatabase: answers.create.indexOf('Content Database') >= 0,
        hasTriggersDatabase: answers.create.indexOf('Modules Database') >= 0,
        hasSchemaDatabase: answers.create.indexOf('Schema Database') >= 0,
        hasModulesDatabase: answers.create.indexOf('Triggers Database') >= 0,
        hasSemantics: features[SEMANTICS] || false,
        imports: imports,
        plugins: plugins,
        configTypes: configTypes,
        common: JSON.stringify(common, null, '  '),
        config: config,
        packageJSON: JSON.stringify(packageJSON, null, '    '),
        srcTSConfig: JSON.stringify(srcTSConfig, null, '    '),
        buildTSConfig: JSON.stringify(buildTSConfig, null, '    ')
      }

      gulp.src(path.join(__dirname, '../templates/**/*'))
        .pipe(template(model))
        .pipe(conflict('./'))
        .pipe(gulp.dest('./'))
        .pipe(install())
        .on('end', function() {
          resolve()
        })
        .on('error', function(e){
          reject(e)
        })
        .resume()
    })
  })
}
