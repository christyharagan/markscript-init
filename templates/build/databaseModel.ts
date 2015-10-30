import {mlDeploy, contentDatabase, triggersDatabase, modulesDatabase, schemaDatabase<% if (hasSemantics){%>, mlRuleSet<%}%>} from 'markscript-basic-build'
<% if (hasSemantics){%>import {variable, prefix, rule} from 'speckle'
<%}%>
@mlDeploy()
export class <%= databaseModel %> {
  name: string
  host: string
  port: number

  constructor(name: string, port: number, host?: string) {
    this.name = name
    this.host = host
    this.port = port
  }
<% if (hasServer) { %>
  get server(): MarkScript.ServerSpec {
    return {
      name: this.name,
      host: this.host,
      port: this.port
    }
  }<% } %>
<% if (hasContentDatabase) { %>
  @contentDatabase()
  get contentDatabase(): MarkScript.DatabaseSpec {
    return {
      name: this.name + '-content'<% if (hasSemantics){%>,
      triples: true<%}%>
    }
  }<% } %>
<% if (hasTriggersDatabase) { %>
  @triggersDatabase()
  get triggersDatabase(): MarkScript.DatabaseSpec {
    return {
      name: this.name + '-triggers'
    }
  }<% } %>
<% if (hasModulesDatabase) { %>
  @modulesDatabase()
  get modulesDatabase(): MarkScript.DatabaseSpec {
    return {
      name: this.name + '-modules'
    }
  }<% } %>
<% if (hasSchemaDatabase) { %>
  @schemaDatabase()
  get schemaDatabase(): MarkScript.DatabaseSpec {
    return {
      name: this.name + '-schema'
    }
  }<% } %>
}
