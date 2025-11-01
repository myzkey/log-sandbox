/**
 * Domain Entity: ALB Log Entry
 */

export class ALBLogEntry {
  rawLine: string;
  type: string = '';
  timestamp: string = '';
  elbName: string = '';
  clientPort: string = '';
  targetPort: string = '';
  requestProcessingTime: number = 0;
  targetProcessingTime: number = 0;
  responseProcessingTime: number = 0;
  elbStatusCode: string = '';
  targetStatusCode: string = '';
  isTimeout: boolean = false;
  receivedBytes: number = 0;
  sentBytes: number = 0;
  requestMethod: string = '';
  requestUrl: string = '';
  requestProtocol: string = '';
  requestPath: string = '';
  userAgent: string = '';
  sslCipher: string = '';
  sslProtocol: string = '';
  targetGroupArn: string = '';
  traceId: string = '';
  domainName: string = '';
  clientIp: string = '';
  totalTime: number = 0;
  isRejected: boolean = false;
  timestampDate: Date = new Date();

  constructor(line: string) {
    this.rawLine = line;
    this.parse(line);
  }

  private parse(line: string): void {
    const parts = line.match(/(?:[^\s"]|"(?:\\.|[^"])*")+/g);

    try {
      if (!parts || parts.length < 19) {
        throw new Error('Invalid log format');
      }

      this.type = parts[0];
      this.timestamp = parts[1];
      this.elbName = parts[2];
      this.clientPort = parts[3];
      this.targetPort = parts[4];
      this.requestProcessingTime = parseFloat(parts[5]);
      this.targetProcessingTime = parseFloat(parts[6]);
      this.responseProcessingTime = parseFloat(parts[7]);

      this.elbStatusCode = parts[8];
      this.targetStatusCode = parts[9];

      this.isTimeout = (this.targetProcessingTime === -1 || this.responseProcessingTime === -1) &&
                       (this.elbStatusCode === '504' || this.elbStatusCode === '502');

      const reqTime = this.requestProcessingTime < 0 ? 0 : this.requestProcessingTime;
      const targetTime = this.targetProcessingTime < 0 ? 0 : this.targetProcessingTime;
      const respTime = this.responseProcessingTime < 0 ? 0 : this.responseProcessingTime;
      this.receivedBytes = parseInt(parts[10]);
      this.sentBytes = parseInt(parts[11]);

      const requestStr = parts[12].replace(/^"|"$/g, '');
      const requestParts = requestStr.split(' ');
      this.requestMethod = requestParts[0] || '-';
      this.requestUrl = requestParts[1] || '-';
      this.requestProtocol = requestParts[2] || '-';

      if (this.requestUrl !== '-') {
        const urlParts = this.requestUrl.split('/');
        if (urlParts.length > 3) {
          this.requestPath = `/${  urlParts.slice(3).join('/')}`;
        } else {
          this.requestPath = '/';
        }
      } else {
        this.requestPath = '-';
      }

      this.userAgent = parts[13].replace(/^"|"$/g, '');
      this.sslCipher = parts[14];
      this.sslProtocol = parts[15];
      this.targetGroupArn = parts[16];
      this.traceId = parts[17].replace(/^"|"$/g, '');
      this.domainName = parts[18].replace(/^"|"$/g, '');

      this.clientIp = this.clientPort.includes(':')
        ? this.clientPort.split(':')[0]
        : this.clientPort;

      this.totalTime = reqTime + targetTime + respTime;

      this.isRejected = (this.requestProcessingTime === -1 ||
                        this.targetProcessingTime === -1 ||
                        this.responseProcessingTime === -1) &&
                       !this.isTimeout;

      this.timestampDate = new Date(this.timestamp);

    } catch (error) {
      console.error('Warning: Failed to parse log line:', (error as Error).message);
      this.elbStatusCode = '-';
      this.targetStatusCode = '-';
      this.totalTime = 0.0;
      this.requestMethod = '-';
      this.requestPath = '-';
      this.clientIp = '-';
    }
  }
}
