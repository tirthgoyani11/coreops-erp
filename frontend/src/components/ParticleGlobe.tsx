import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticleGlobe() {
    const pointsRef = useRef<THREE.Points>(null);
    const atmosphereRef = useRef<THREE.Mesh>(null);

    // Generate Particles
    const particles = useMemo(() => {
        const count = 6000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const color1 = new THREE.Color('#6DFF8E'); // Brand Green
        const color2 = new THREE.Color('#3b82f6'); // Blue
        const color3 = new THREE.Color('#ffffff'); // White

        for (let i = 0; i < count; i++) {
            // Spherical distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 1.5 + (Math.random() * 0.1); // Radius variation

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Random Color Mix
            const mix = Math.random();
            const finalColor = mix < 0.6 ? color1 : (mix < 0.9 ? color2 : color3);

            colors[i * 3] = finalColor.r;
            colors[i * 3 + 1] = finalColor.g;
            colors[i * 3 + 2] = finalColor.b;

            sizes[i] = Math.random() * 1.5;
        }

        return { positions, colors, sizes };
    }, []);

    useFrame((state) => {
        if (pointsRef.current) {
            // Auto Rotation
            pointsRef.current.rotation.y += 0.002;

            // Mouse Interaction (Parallax/Tilt)
            // LERP for smooth follow
            const targetX = -state.pointer.y * 0.2; // Tilt up/down
            const targetY = state.pointer.x * 0.2;  // Tilt left/right

            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetX, 0.1);
            pointsRef.current.rotation.z = THREE.MathUtils.lerp(pointsRef.current.rotation.z, targetY, 0.1);
        }
        if (atmosphereRef.current) {
            atmosphereRef.current.rotation.y += 0.001;
        }
    });

    return (
        <group>
            {/* Particles */}
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particles.positions.length / 3}
                        array={particles.positions}
                        itemSize={3}
                        args={[particles.positions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={particles.colors.length / 3}
                        array={particles.colors}
                        itemSize={3}
                        args={[particles.colors, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-size"
                        count={particles.sizes.length}
                        array={particles.sizes}
                        itemSize={1}
                        args={[particles.sizes, 1]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.015}
                    vertexColors
                    transparent
                    opacity={0.8}
                    sizeAttenuation
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Inner Glow Sphere (Atmosphere) */}
            <mesh ref={atmosphereRef}>
                <sphereGeometry args={[1.4, 64, 64]} />
                <meshBasicMaterial
                    color="#6DFF8E"
                    transparent
                    opacity={0.05}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Outer Faint Atmosphere */}
            <mesh>
                <sphereGeometry args={[1.6, 64, 64]} />
                <meshBasicMaterial
                    color="#3b82f6"
                    transparent
                    opacity={0.03}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
}
