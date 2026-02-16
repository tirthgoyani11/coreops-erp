import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

export function HolographicGlobe() {
    const groupRef = useRef<THREE.Group>(null);

    // Mouse Interaction Logic for Rotation
    useFrame((state) => {
        if (groupRef.current) {
            const targetX = state.pointer.x * 0.2;
            const targetY = -state.pointer.y * 0.2;

            // Smooth LERP rotation
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX + state.clock.getElapsedTime() * 0.05, 0.05);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetY, 0.05);
        }
    });

    return (
        <group ref={groupRef}>
            <GlobeCore />
            <Atmosphere />
            <DataNetwork />
            <OrbitalRings />
        </group>
    );
}

// 1. Core Dark Sphere
function GlobeCore() {
    return (
        <Sphere args={[1.2, 64, 64]}>
            <meshBasicMaterial color="#020617" transparent opacity={0.9} />
        </Sphere>
    );
}

// 2. Glowing Atmosphere
function Atmosphere() {
    return (
        <Sphere args={[1.2, 64, 64]}>
            <meshBasicMaterial
                color="#6DFF8E"
                transparent
                opacity={0.1}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
            />
        </Sphere>
    );
}

// 3. Connected Nodes (The "Network")
function DataNetwork() {
    // Generate random points on sphere surface
    const { nodes, connections } = useMemo(() => {
        const count = 40;
        const radius = 1.25;
        const positions: THREE.Vector3[] = [];

        // Golden Spiral distribution for even spread
        const phi = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < count; i++) {
            const y = 1 - (i / (count - 1)) * 2;
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;
            positions.push(new THREE.Vector3(x * radius, y * radius, z * radius));
        }

        const lines: THREE.Vector3[][] = [];
        const threshold = 0.8; // Connection distance

        positions.forEach((p1, i) => {
            positions.forEach((p2, j) => {
                if (i < j && p1.distanceTo(p2) < threshold) {
                    lines.push([p1, p2]);
                }
            });
        });

        return { nodes: positions, connections: lines };
    }, []);

    return (
        <group>
            {/* Render Nodes */}
            {nodes.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshBasicMaterial color="#6DFF8E" />
                </mesh>
            ))}

            {/* Render Lines */}
            {connections.map((line, i) => (
                <Line
                    key={i}
                    points={line}
                    color="#6DFF8E"
                    transparent
                    opacity={0.15}
                    lineWidth={1}
                />
            ))}
        </group>
    );
}

// 4. Decorative Rings
function OrbitalRings() {
    return (
        <>
            <Ring radius={1.4} rotation={[Math.PI / 3, Math.PI / 4, 0]} speed={0.2} opacity={0.3} />
            <Ring radius={1.6} rotation={[-Math.PI / 3, 0, Math.PI / 6]} speed={0.15} opacity={0.2} />
            <Ring radius={1.8} rotation={[Math.PI / 2, Math.PI / 6, 0]} speed={0.1} opacity={0.1} />
        </>
    );
}

function Ring({ radius, rotation, speed, opacity }: { radius: number, rotation: [number, number, number], speed: number, opacity: number }) {
    const ref = useRef<THREE.Group>(null);
    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.z += speed * 0.01;
        }
    });

    // Create circle points
    const points = useMemo(() => {
        const pts = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }
        return pts;
    }, [radius]);

    return (
        <group rotation={rotation} ref={ref}>
            <Line points={points} color="#6DFF8E" transparent opacity={opacity} lineWidth={1} />
        </group>
    );
}
