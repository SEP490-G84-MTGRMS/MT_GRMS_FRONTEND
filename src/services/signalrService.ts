import * as signalR from '@microsoft/signalr';

class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;

  public async startConnection(hubUrl: string = '/hubs/pos'): Promise<void> {
    const token = localStorage.getItem('access_token');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build();

    try {
      await this.hubConnection.start();
      console.log('SignalR connected to', hubUrl);
    } catch (err) {
      console.error('SignalR connection error: ', err);
    }
  }

  public on(eventName: string, callback: (...args: any[]) => void): void {
    this.hubConnection?.on(eventName, callback);
  }

  public off(eventName: string): void {
    this.hubConnection?.off(eventName);
  }

  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }
}

export const signalRService = new SignalRService();
