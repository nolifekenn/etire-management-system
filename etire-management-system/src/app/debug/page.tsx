import DatabaseDiagnostic from '@/components/DatabaseDiagnostic';
import ConnectionTest from './connection-test';
import SimpleTest from './simple-test';

export default function DebugPage() {
    return (
        <div className="space-y-6">
            <SimpleTest />
            <ConnectionTest />
            <DatabaseDiagnostic />
        </div>
    );
}