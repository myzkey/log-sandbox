import { db } from "@alb-analyzer/db/client";
import { albLogs } from "@alb-analyzer/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Clock, Globe, Server, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getLog(id: string) {
  const logs = await db
    .select()
    .from(albLogs)
    .where(eq(albLogs.id, parseInt(id)))
    .limit(1);

  return logs[0];
}

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const log = await getLog(id);

  if (!log) {
    notFound();
  }

  const statusCode = parseInt(log.elbStatusCode);
  const isError = statusCode >= 400;
  const isTimeout = log.isTimeout;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/logs"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to logs
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Log Details #{log.id}
            </h1>
            <div className="flex items-center gap-3">
              {isTimeout && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                  Timeout
                </span>
              )}
              {log.isRejected && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                  Rejected
                </span>
              )}
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  isError
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {log.elbStatusCode}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Information */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Request Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Method</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.requestMethod}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Protocol</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.requestProtocol}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">URL</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {log.requestUrl}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Path</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {log.requestPath}
                </dd>
              </div>
            </div>
          </section>

          {/* Client Information */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  IP Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {log.clientIp}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Port</dt>
                <dd className="mt-1 text-sm text-gray-900">{log.clientPort}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  User Agent
                </dt>
                <dd className="mt-1 text-sm text-gray-900 break-all">
                  {log.userAgent || "-"}
                </dd>
              </div>
            </div>
          </section>

          {/* Server Information */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">ELB Name</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {log.elbName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Target Status
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.targetStatusCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Target IP</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {log.targetIp || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Target Port
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{log.targetPort}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  Target Group ARN
                </dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {log.targetGroupArn}
                </dd>
              </div>
            </div>
          </section>

          {/* Timing Information */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timing Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Request Processing
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.requestProcessingTime.toFixed(3)}s
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Target Processing
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.targetProcessingTime.toFixed(3)}s
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Response Processing
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.responseProcessingTime.toFixed(3)}s
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Total Time
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {log.totalTime.toFixed(3)}s
                </dd>
              </div>
            </div>
          </section>

          {/* Data Transfer */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Data Transfer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Received Bytes
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.receivedBytes.toLocaleString()} bytes
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Sent Bytes
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.sentBytes.toLocaleString()} bytes
                </dd>
              </div>
            </div>
          </section>

          {/* SSL/TLS Information */}
          {log.sslCipher && log.sslProtocol && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                SSL/TLS Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Protocol
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {log.sslProtocol}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cipher</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {log.sslCipher}
                  </dd>
                </div>
              </div>
            </section>
          )}

          {/* Additional Info */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Additional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(log.timestamp).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Domain Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.domainName || "-"}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Trace ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {log.traceId || "-"}
                </dd>
              </div>
            </div>
          </section>

          {/* Raw Log Line */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Raw Log Line</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all">
                {log.rawLine}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
