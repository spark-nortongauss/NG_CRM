import { FileUploadZone } from "@/components/file-upload-zone";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

export default function AddContactPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Import Contacts
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Upload a CSV or Excel file to add multiple contacts at once
                        </p>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                        <p className="font-medium text-blue-900">
                            File Format Requirements
                        </p>
                        <ul className="text-blue-800 space-y-1 list-disc list-inside">
                            <li>Your file should be in CSV, XLSX, or XLS format</li>
                            <li>Include headers: Name, Email, Phone, Company, etc.</li>
                            <li>Maximum file size: 10 MB</li>
                            <li>Duplicate emails will be automatically skipped</li>
                        </ul>
                    </div>
                </div>

                {/* Upload Zone */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <FileUploadZone />
                </div>

                {/* Help Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Need help preparing your file?
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>
                            <strong>Sample CSV format:</strong>
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                            <div>Name,Email,Phone,Company,Position</div>
                            <div>John Doe,john@example.com,+1234567890,Acme Inc,Manager</div>
                            <div>Jane Smith,jane@example.com,+0987654321,Tech Corp,Developer</div>
                        </div>
                        <p className="mt-3">
                            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                                Download sample template →
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
