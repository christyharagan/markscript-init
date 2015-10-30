export interface Common {
    appName: string;
    ml: {
        host?: string;
        port: number;
        user: string;
        password: string;
    };
}
export interface Model {
    appName: string;
    databaseModel: string;
    hasServer: boolean;
    hasContentDatabase: boolean;
    hasTriggersDatabase: boolean;
    hasSchemaDatabase: boolean;
    hasModulesDatabase: boolean;
    hasSemantics: boolean;
    imports: [string, string][];
    plugins: string[];
    configTypes: string[];
    common: string;
    config: {
        [key: string]: string;
    };
    packageJSON: string;
    buildTSConfig: string;
    srcTSConfig: string;
}
