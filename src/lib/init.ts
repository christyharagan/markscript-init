import * as gulp from 'gulp'
import * as path from 'path'
import * as inquirer from 'inquirer'
import * as os from 'os'
import * as fs from 'fs'
import {Common, Model} from './model'
let install = require('gulp-install')
let conflict = require('gulp-conflict')
let template = require('gulp-template')

interface Answers extends inquirer.Answers {
  appName: string
  hostName: string
  profile: string
  language: string
  create: string[]
  createFileServer: boolean
}

export function init() {
  return new Promise(function(resolve, reject){
    inquirer.prompt([
      { type: 'input', name: 'appName', message: 'The name of the application', default: path.basename(process.cwd()).replace(/ /g, '_') },
      { type: 'input', name: 'hostName', message: 'The hostname of the MarkLogic server (leave blank for system hostname)', default: os.hostname().toLowerCase() },
      { type: 'list', name: 'profile', message: 'The profile to use', choices: ['Full', 'Basic'] },
      // TODO: Support JavaScript
      //{ type: 'list', name: 'language', message: 'The language to use', choices: ['TypeScript', 'JavaScript'] },
      { type: 'checkbox', name: 'create', message: 'What does your program require it\'s own?', choices: [{ name: 'HTTP Server', checked: true }, { name: 'Content Database', checked: true }, { name: 'Modules Database', checked: true }, { name: 'Schema Database', checked: true }, { name: 'Triggers Database', checked: true }] },
      {
        type: 'input', name: 'httpPort', message: 'The port of the new HTTP server', default: 8010, when: function(answers) {
          let create = <string[]>answers['create']
          return create.indexOf('HTTP Server') >= 0
        }
      },
      { type: 'confirm', name: 'createFileServer', message: 'Create file server' }
    ], function(answers: Answers) {
      let imports: [string, string][] = [['basicBuildPlugin', 'markscript-basic-build']]
      let plugins: string[] = ['basicBuildPlugin']
      let configTypes: string[] = ['MarkScript.BuildConfig', 'MarkScript.BasicBuildConfig']
      let common: Common & { koa?: any } = {
        appName: answers.appName,
        ml: {
          host: answers.hostName,
          user: 'admin',
          password: 'admin',
          port: 8000
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
          './lib/**/*.ts',
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
          'node_modules/*/model.d.ts',
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

      if (answers.profile === 'Full') {
        imports.push(['uServicesPlugin', 'markscript-uservices-build'])
        plugins.push('uServicesPlugin')
        configTypes.push('MarkScript.UServicesBuildConfig')
        packageJSON['dependencies']['markscript-uservices'] = '^0.6.0'
        packageJSON['devDependencies']['markscript-uservices-build'] = '^0.1.2'
        srcTSConfig.files.push('../node_modules/markscript-uservices/model.d.ts')
        buildTSConfig.files.push('node_modules/markscript-uservices-build/build.d.ts', 'node_modules/markscript-koa/build.d.ts')
      }

      if (answers.createFileServer) {
        config['fileServerPath'] = '\'./www\''
        if (!fs.existsSync(path.join(process.cwd(), 'www'))) {
          fs.mkdirSync(path.join(process.cwd(), 'www'))
        }
      }

      if (answers.profile === 'Full' || answers.createFileServer) {
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

      let model: Model = {
        appName: answers.appName,
        hasServer: answers.create.indexOf('HTTP Server') >= 0,
        hasContentDatabase: answers.create.indexOf('Content Database') >= 0,
        hasTriggersDatabase: answers.create.indexOf('Modules Database') >= 0,
        hasSchemaDatabase: answers.create.indexOf('Schema Database') >= 0,
        hasModulesDatabase: answers.create.indexOf('Triggers Database') >= 0,
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
