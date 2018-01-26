import {ICommandHandler} from './ICommandHandler';
import {ICommand} from './command';
import {IProjection} from './IProjection';
import {IEventDispatcher} from './IEventDispatcher';
import {IEvent} from './event';
import {IQuery} from './IQuery';

/**
 * Bounded context interface.
 *
 * @author Dragos Sebestin
 */
export interface IContext {

  /**
   * Execute a command on the context.
   */
  command (name: string, command: ICommand<any>) : Promise<void>;

  /**
   * Execute a query on the context.
   */
  query <ReturnType> (name: string, filters: any) : Promise<ReturnType>;
}

/**
 * Class implementing a local bounded context.
 *
 * @author Dragos Sebestin
 */
export class LocalContext implements IContext {
  private _commandHandlers: Map<string, ICommandHandler<any>> = new Map();

  /**
   * Class constructor.
   */
  constructor (private _name: string) {}

  /**
   * Register a new command handler on the context.
   */
  registerCommandHandler (commandName: string, handler: ICommandHandler<any>) : void {
    if (this._commandHandlers.has(commandName))
      throw new Error(`${this._name} context already has a command handler for ${commandName}.`);

    this._commandHandlers.set(commandName, handler);
  }

  /**
   * IContext interface methods.
   */

  async command (commandName: string, command: ICommand<any>) : Promise<void> {
    let handler = this._commandHandlers.get(commandName);
    if (!handler)
      throw new Error(`${this._name} context has no command handler registered for ${commandName}.`);

    await handler.execute(command);
  }

  async query <ReturnType> (name: string, filters: any) : Promise<ReturnType> {
    name; filters;
    throw new Error('not implemented');
  }
}

/**
 * Class implementing a remote bounded context.
 *
 * @author Dragos Sebestin
 */
export class RemoteContext implements IContext {
  private _projections: Array<{
    isForEvent: string,
    handler: IProjection
  }> = [];

  private _queries: Map<string, IQuery<any>> = new Map();

  /**
   * Class constructor.
   */
  constructor (private _name: string, eventDispatcher: IEventDispatcher) {
    eventDispatcher.register(event => this.runProjections(event));
  }

  /**
   * Register a new projection for the an event.
   */
  registerProjection (eventName: string, projection: IProjection) : void {
    this._projections.push({
      isForEvent: eventName,
      handler: projection
    });
  }

  /**
   * Register a new query on this context.
   */
  registerQuery (name: string, query: IQuery<any>) : void {
    if (this._queries.has(name))
      throw new Error(`${this._name} context already has a registered query named ${name}.`);

    this._queries.set(name, query);
  }

  /**
   * IContext interface methods.
   */

  async command (commandName: string, command: ICommand<any>) : Promise<void> {
    commandName; command;
    throw new Error('not implemented');
  }

  query <ReturnType> (name: string, filters: any) : Promise<ReturnType> {
    let query = this._queries.get(name);
    if (!query)
      throw new Error(`${this._name} context has no registered query named ${name}.`);

    return query.execute(filters);
  }

  private async runProjections (event: IEvent<any>) : Promise<void> {
    let projections = this._projections
      .filter(registrant => registrant.isForEvent === event.name)
      .map(registrant => registrant.handler);

    for (let projection of projections) {
      await projection.handle(event);
    }
  }
}

