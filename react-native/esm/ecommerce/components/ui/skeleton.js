import * as React from 'react';
import { Animated, StyleSheet } from 'react-native';
export function Skeleton({ style, width, height, ...props }) {
    const pulseAnim = React.useRef(new Animated.Value(0.5)).current;
    React.useEffect(() => {
        const pulse = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 0.5,
                duration: 800,
                useNativeDriver: true,
            }),
        ]));
        pulse.start();
        return () => {
            pulse.stop();
        };
    }, [pulseAnim]);
    return (<Animated.View style={[
            styles.skeleton,
            { width: width, height: height },
            { opacity: pulseAnim },
            style,
        ]} {...props}/>);
}
const styles = StyleSheet.create({
    skeleton: {
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
    },
});
//# sourceMappingURL=skeleton.js.map