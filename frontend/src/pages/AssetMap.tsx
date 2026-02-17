import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
import { MapPin, Filter, ZoomIn, ZoomOut } from 'lucide-react';

// Placeholder data for map pins
const MOCK_ASSETS = [
    { id: '1', name: 'Server Rack A', type: 'IT', x: 20, y: 30, status: 'operational' },
    { id: '2', name: 'Conf Room TV', type: 'Electronics', x: 45, y: 50, status: 'operational' },
    { id: '3', name: 'Reception PC', type: 'IT', x: 70, y: 60, status: 'maintenance' },
    { id: '4', name: 'Printer Room 2', type: 'Electronics', x: 30, y: 70, status: 'low_toner' },
];

export function AssetMap() {
    const [zoom, setZoom] = useState(1);
    const [filterType, setFilterType] = useState('all');

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

    const filteredAssets = filterType === 'all'
        ? MOCK_ASSETS
        : MOCK_ASSETS.filter(a => a.type === filterType);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Asset Map</h1>
                    <p className="text-sm text-gray-500">Geospatial vizualization of asset distribution</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="IT">IT Infrastructure</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={handleZoomOut}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleZoomIn}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Card className="relative w-full h-[600px] overflow-hidden bg-gray-100 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                {/* 
                  In a real app, this would be a Leaflet map or an SVG/Canvas with proper coordinates.
                  For this MVP, we use the generated floor plan image and absolute positioning.
                  Note: The image path should be updated to where the artifact is saved.
                  Since I can't know the exact URI in advance for 'src', I will use the asset name approach or relative path if copied.
                  For now, I'll assume the user copies it to /public/assets/floor_plan.png or I serve it.
                  Actually, I will just reference the artifact path via import if possible, but easier to just put a placeholder "Image Here" text effectively or use a reliable URL.
                  I will use the artifact functionality: I can't easily modify the src to point to 'generated image' without moving it.
                  I'll use a placeholder div that says "Floor Plan Image" and overlay dots.
                */}

                <div
                    className="relative transition-transform duration-300 ease-in-out"
                    style={{ transform: `scale(${zoom})`, width: '800px', height: '600px', backgroundImage: 'url("/assets/office_floor_plan.png")', backgroundSize: 'cover' }}
                >
                    {/* If image is missing, show text */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                        [Office Floor Plan Image]
                    </div>

                    {filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                            style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                        >
                            <MapPin
                                className={`w-8 h-8 ${asset.status === 'operational' ? 'text-green-500' :
                                        asset.status === 'maintenance' ? 'text-red-500' : 'text-yellow-500'
                                    } drop-shadow-md`}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {asset.name} ({asset.status})
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-4 gap-4">
                {['Operational', 'Maintenance', 'Low Stock', 'Offline'].map(status => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status === 'Operational' ? 'bg-green-500' :
                                status === 'Maintenance' ? 'bg-red-500' :
                                    status === 'Low Stock' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`} />
                        <span className="text-sm font-medium">{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AssetMap;
