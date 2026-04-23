"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  shift1Timing: string;
  shift2Timing: string;
  shift3Timing: string;
}

export default function HandoverSelector() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedShift, setSelectedShift] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
        setLoading(false);
      });
  }, []);

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  const getShiftTiming = (shift: string) => {
    if (!selectedProjectData) return "";
    switch (shift) {
      case "1":
        return selectedProjectData.shift1Timing;
      case "2":
        return selectedProjectData.shift2Timing;
      case "3":
        return selectedProjectData.shift3Timing;
      default:
        return "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProject && selectedDate && selectedShift) {
      router.push(`/handover/${selectedProject}/${selectedDate}/${selectedShift}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-3">
          <ClipboardList className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Shift Handover</h1>
        <p className="text-gray-500 mt-1">Select your project, date, and shift to begin</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
          <div className="grid grid-cols-3 gap-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProject(project.id)}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  selectedProject === project.id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3"].map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => setSelectedShift(shift)}
                className={`px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  selectedShift === shift
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">
                  {shift === "1" ? "Morning" : shift === "2" ? "Afternoon" : "Night"}
                </div>
                <div className="text-xs mt-0.5 opacity-75">{getShiftTiming(shift)}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Open Handover Form
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
