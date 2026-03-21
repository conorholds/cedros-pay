"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Testimonials = Testimonials;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const card_1 = require("../ui/card");
function StarRating({ rating }) {
    return (<react_native_1.View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (<react_native_1.Text key={star} style={styles.star}>
          {star <= rating ? '★' : '☆'}
        </react_native_1.Text>))}
    </react_native_1.View>);
}
function Testimonials({ testimonials, title = 'What our customers say', style, }) {
    if (!testimonials.length)
        return null;
    return (<react_native_1.View style={[styles.container, style]}>
      {title && <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>}

      <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {testimonials.map((testimonial) => (<card_1.Card key={testimonial.id} style={styles.card}>
            <card_1.CardContent style={styles.cardContent}>
              {testimonial.rating && (<StarRating rating={testimonial.rating}/>)}
              <react_native_1.Text style={styles.quote}>"{testimonial.quote}"</react_native_1.Text>
              <react_native_1.View style={styles.authorContainer}>
                <react_native_1.Text style={styles.author}>{testimonial.author}</react_native_1.Text>
                {testimonial.role && (<react_native_1.Text style={styles.role}>{testimonial.role}</react_native_1.Text>)}
              </react_native_1.View>
            </card_1.CardContent>
          </card_1.Card>))}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingVertical: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#171717',
        textAlign: 'center',
        marginBottom: 16,
    },
    scrollContent: {
        gap: 12,
        paddingHorizontal: 16,
    },
    card: {
        width: 280,
        flexShrink: 0,
    },
    cardContent: {
        padding: 16,
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    star: {
        fontSize: 16,
        color: '#fbbf24',
        marginRight: 2,
    },
    quote: {
        fontSize: 14,
        color: '#525252',
        lineHeight: 20,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    authorContainer: {
        marginTop: 'auto',
    },
    author: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    role: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
    },
});
//# sourceMappingURL=Testimonials.js.map