import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardContent } from "../../../components/common/Card";

export function EcosystemBreakdownChart({ ecosystems = {} }) {
  const data = [
    {
      name: "Maven",
      Total: ecosystems.MAVEN?.total || 0,
      Complete: ecosystems.MAVEN?.complete || 0,
    },
    {
      name: "PyPI",
      Total: ecosystems.PYPI?.total || 0,
      Complete: ecosystems.PYPI?.complete || 0,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Cache Resolution by Ecosystem"
        subtitle="Total cached vs fully completed package graph resolutions"
      />
      <CardContent className="h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                borderColor: "#e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="circle"
            />
            <Bar dataKey="Total" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={28} />
            <Bar dataKey="Complete" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default EcosystemBreakdownChart;
