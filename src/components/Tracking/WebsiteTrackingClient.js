"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Clock,
  TrendingUp,
  Search,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Zap,
  RefreshCw,
  Copy,
  Filter,
  Sparkles
} from "lucide-react";

const WebsiteTrackingClient = ({ initialRows = [], curruser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | productive | unproductive | neutral

  const formatTime = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatus = (url) => {
    const u = String(url || "").toLowerCase();
    const unproductive = ["facebook", "youtube", "netflix", "twitter", "instagram", "reddit", "tiktok"];
    const productive = ["github", "stackoverflow", "localhost", "gemini", "google", "lovable", "jira", "confluence", "docs.google"];
    if (unproductive.some((s) => u.includes(s))) return "unproductive";
    if (productive.some((s) => u.includes(s))) return "productive";
    return "neutral";
  };

  const statusMeta = {
    productive: { label: "Productive", icon: CheckCircle2, pill: "bg-green-50 text-green-700 border-green-200" },
    unproductive: { label: "Unproductive", icon: XCircle, pill: "bg-red-50 text-red-700 border-red-200" },
    neutral: { label: "Neutral", icon: AlertCircle, pill: "bg-amber-50 text-amber-800 border-amber-200" }
  };

  const getDomain = (websiteUrl) => {
    const raw = String(websiteUrl || "").trim();
    if (!raw) return "";
    // if it is already a domain like "github.com" keep it
    // if it contains path, chop it
    const noProto = raw.replace(/^https?:\/\//i, "");
    return noProto.split("/")[0].toLowerCase();
  };

  const faviconUrl = (domain) => {
    if (!domain) return "";
    // reliable favicon endpoint
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  };

  const filteredData = useMemo(() => {
    const list = Array.isArray(initialRows) ? initialRows : [];
    const q = searchTerm.trim().toLowerCase();

    return list
      .filter((row) => {
        const url = String(row?.website_url || "");
        const domain = getDomain(url);
        const matchSearch = !q || url.toLowerCase().includes(q) || domain.includes(q);
        if (!matchSearch) return false;

        if (statusFilter === "all") return true;
        return getStatus(url) === statusFilter;
      })
      .map((row) => {
        const url = String(row?.website_url || "");
        const domain = getDomain(url);
        const st = getStatus(url);
        return { ...row, __domain: domain, __status: st };
      })
      .sort((a, b) => (Number(b.duration_seconds) || 0) - (Number(a.duration_seconds) || 0));
  }, [initialRows, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const total = filteredData.reduce((acc, r) => acc + (Number(r.duration_seconds) || 0), 0);
    const by = { productive: 0, unproductive: 0, neutral: 0 };
    for (const r of filteredData) by[r.__status] += Number(r.duration_seconds) || 0;

    const score = total > 0 ? Math.round((by.productive / total) * 100) : 0;

    // top 5
    const topSites = filteredData.slice(0, 5);
    return { total, by, score, topSites };
  }, [filteredData]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch (_) {}
  };

  const quickFilterButton = (key, label, cls) => (
    <button
      type="button"
      onClick={() => setStatusFilter(key)}
      className={[
        "text-xs font-semibold px-3 py-1.5 rounded-full border transition",
        statusFilter === key ? "bg-[#095cfd] text-white border-[#095cfd]" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
        cls || ""
      ].join(" ")}
    >
      {label}
    </button>
  );

  const topSites = totals.topSites;
  const maxTop = Math.max(1, ...(topSites.map((x) => Number(x.duration_seconds) || 0)));

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#095cfd] bg-white/70 border border-[rgba(9,92,253,0.2)] px-3 py-1 rounded-full backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Website Intelligence
            </div>

            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Website Activity</h1>
            <p className="text-gray-600">
              Monitoring digital footprint for <span className="font-semibold text-[#095cfd]">{curruser?.name || "User"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="gap-2 border-[rgba(9,92,253,0.3)] bg-white/70 backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => copyText(JSON.stringify(filteredData, null, 2))}
              className="gap-2 border-gray-200 bg-white/70 backdrop-blur-sm"
            >
              <Copy className="w-4 h-4" />
              Copy JSON
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 w-full lg:max-w-xl">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by domain or URL…"
                    className="pl-9 bg-white border-[rgba(9,92,253,0.2)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Filter className="w-4 h-4" />
                  Quick filters:
                </div>

                {quickFilterButton("all", "All")}
                {quickFilterButton("productive", "Productive")}
                {quickFilterButton("neutral", "Neutral")}
                {quickFilterButton("unproductive", "Unproductive")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Active Time</p>
                  <div className="text-3xl font-bold text-gray-900 tabular-nums">{formatTime(totals.total)}</div>
                  <div className="text-xs text-gray-500">
                    {filteredData.length} domain{filteredData.length === 1 ? "" : "s"} tracked
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#095cfd]/10 text-[#095cfd]">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Efficiency</p>
                  <div className="text-3xl font-bold text-gray-900 tabular-nums">{totals.score}%</div>
                  <div className="text-xs text-gray-500">Based on productive time ratio</div>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 text-green-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <Progress value={totals.score} className="h-1.5 mt-4 bg-gray-100" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Breakdown</p>
                  <div className="text-sm font-semibold text-gray-900">Productivity split</div>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-700">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2">
                {(["productive", "neutral", "unproductive"] || []).map((k) => {
                  const pct = totals.total > 0 ? Math.round((totals.by[k] / totals.total) * 100) : 0;
                  const label = statusMeta[k].label;
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-semibold text-gray-700">{label}</div>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full ${k === "productive" ? "bg-green-500" : k === "unproductive" ? "bg-red-500" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-10 text-right text-xs font-semibold text-gray-700 tabular-nums">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Peak Usage */}
          <Card className="lg:col-span-4 border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#095cfd]/7 to-transparent border-b border-[rgba(9,92,253,0.12)]">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#095cfd]" />
                Peak Usage
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {topSites.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No data to show. Try clearing filters or refreshing.
                </div>
              ) : (
                topSites.map((site, idx) => {
                  const d = site.__domain || getDomain(site.website_url);
                  const ratio = Math.round(((Number(site.duration_seconds) || 0) / maxTop) * 100);
                  const st = site.__status || getStatus(site.website_url);
                  const pill = statusMeta[st].pill;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <img
                            src={faviconUrl(d)}
                            alt=""
                            className="w-5 h-5 rounded-sm bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">{d || site.website_url}</div>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${pill}`}>
                              {statusMeta[st].label}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-gray-600 tabular-nums">{formatTime(site.duration_seconds)}</div>
                      </div>

                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] rounded-full"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="lg:col-span-8 border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#095cfd]/7 to-transparent border-b border-[rgba(9,92,253,0.12)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-600">
                  Detailed Logs
                </CardTitle>

                <div className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{filteredData.length}</span> results
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
                  <TableRow className="border-gray-100">
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider px-6 text-gray-500">Website</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider px-6 text-gray-500">Time</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider px-6 text-gray-500">Status</TableHead>
                    <TableHead className="px-4 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100/60">
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-6 py-10">
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-[#095cfd]/10 flex items-center justify-center text-[#095cfd]">
                            <Search className="w-5 h-5" />
                          </div>
                          <div className="text-sm font-semibold text-gray-800">No matching results</div>
                          <div className="text-xs text-gray-500">Try a different keyword or reset filters.</div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" onClick={() => setSearchTerm("")}>
                              Clear search
                            </Button>
                            <Button variant="outline" onClick={() => setStatusFilter("all")}>
                              Reset filters
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, i) => {
                      const domain = row.__domain || getDomain(row.website_url);
                      const st = row.__status || getStatus(row.website_url);
                      const meta = statusMeta[st];
                      const Icon = meta.icon;

                      return (
                        <TableRow key={i} className="hover:bg-[#095cfd]/5 transition-colors group">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={faviconUrl(domain)}
                                alt=""
                                className="w-6 h-6 rounded-md bg-white border border-gray-100"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{domain || row.website_url}</div>
                                <div className="text-xs text-gray-500 truncate">{row.website_url}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-6 py-4">
                            <div className="text-sm font-semibold text-[#095cfd] tabular-nums">
                              {formatTime(row.duration_seconds)}
                            </div>
                            <div className="text-[11px] text-gray-500 tabular-nums">
                              {(Number(row.duration_seconds) || 0).toLocaleString()}s
                            </div>
                          </TableCell>

                          <TableCell className="px-6 py-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.pill}`}>
                              <Icon className="w-4 h-4" />
                              {meta.label}
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => copyText(domain || row.website_url)}
                                className="p-2 rounded-md border border-gray-200 bg-white hover:border-gray-300"
                                title="Copy"
                              >
                                <Copy className="w-4 h-4 text-gray-600" />
                              </button>

                              <a
                                href={`https://${domain || row.website_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-md border border-gray-200 bg-white hover:border-[rgba(9,92,253,0.4)] hover:text-[#095cfd]"
                                title="Open"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WebsiteTrackingClient;
