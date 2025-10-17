/**
 * iCal Format Validator
 * Validates .ics files for RFC 5545 compliance and calendar app compatibility
 */

export interface IcalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  format: {
    hasCalendar: boolean;
    hasEvents: boolean;
    eventCount: number;
    requiredFieldsPresent: boolean;
  };
}

export class IcalValidator {
  /**
   * Validate an iCal file content
   * Checks RFC 5545 compliance and common calendar app requirements
   */
  validateIcal(content: string): IcalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const format = {
      hasCalendar: false,
      hasEvents: false,
      eventCount: 0,
      requiredFieldsPresent: false
    };

    // 1. Check basic calendar structure
    if (!content.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing BEGIN:VCALENDAR');
    } else {
      format.hasCalendar = true;
    }

    if (!content.includes('END:VCALENDAR')) {
      errors.push('Missing END:VCALENDAR');
    }

    // 2. Check required VCALENDAR properties
    if (!content.includes('VERSION:')) {
      errors.push('Missing VERSION property');
    }

    if (!content.includes('PRODID:')) {
      errors.push('Missing PRODID property');
    }

    // 3. Extract and validate events
    const eventMatches = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);

    if (!eventMatches || eventMatches.length === 0) {
      warnings.push('No events found in calendar');
    } else {
      format.hasEvents = true;
      format.eventCount = eventMatches.length;

      // Validate each event
      let allEventsValid = true;
      eventMatches.forEach((event, index) => {
        const eventErrors = this.validateEvent(event, index + 1);
        if (eventErrors.length > 0) {
          allEventsValid = false;
          errors.push(...eventErrors);
        }
      });

      format.requiredFieldsPresent = allEventsValid;
    }

    // 4. Check line folding (RFC 5545: lines should be max 75 octets)
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.length > 75 && !line.startsWith(' ')) {
        warnings.push(`Line ${index + 1} exceeds 75 characters (should be folded)`);
      }
    });

    // 5. Check for proper line endings (should be CRLF)
    if (!content.includes('\r\n') && content.includes('\n')) {
      warnings.push('Using LF instead of CRLF line endings (may cause issues on some platforms)');
    }

    // 6. Check URL encoding in descriptions
    const urlMatches = content.match(/claude-session:\/\/[^\s\\]+/g);
    if (urlMatches) {
      urlMatches.forEach(url => {
        if (url.includes(' ')) {
          errors.push(`URL contains unencoded spaces: ${url}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      format
    };
  }

  /**
   * Validate a single VEVENT
   */
  private validateEvent(event: string, eventNumber: number): string[] {
    const errors: string[] = [];

    // Required fields per RFC 5545
    const requiredFields = ['DTSTART:', 'DTSTAMP:', 'UID:'];

    requiredFields.forEach(field => {
      if (!event.includes(field)) {
        errors.push(`Event ${eventNumber}: Missing required field ${field.slice(0, -1)}`);
      }
    });

    // DTEND or DURATION is required (but not both)
    const hasDtEnd = event.includes('DTEND:');
    const hasDuration = event.includes('DURATION:');

    if (!hasDtEnd && !hasDuration) {
      errors.push(`Event ${eventNumber}: Must have either DTEND or DURATION`);
    }

    if (hasDtEnd && hasDuration) {
      errors.push(`Event ${eventNumber}: Cannot have both DTEND and DURATION`);
    }

    // Check SUMMARY (highly recommended but not required)
    if (!event.includes('SUMMARY:')) {
      errors.push(`Event ${eventNumber}: Missing SUMMARY (event will show as "No Title")`);
    }

    // Validate date format (basic check)
    const dateMatches = event.match(/DT(?:START|END):([\dTZ]+)/);
    if (dateMatches) {
      const dateValue = dateMatches[1];
      // UTC format: YYYYMMDDTHHmmssZ
      if (!/^\d{8}T\d{6}Z$/.test(dateValue)) {
        errors.push(`Event ${eventNumber}: Invalid date format "${dateValue}" (expected YYYYMMDDTHHmmssZ)`);
      }
    }

    return errors;
  }

  /**
   * Check calendar app compatibility
   */
  checkCompatibility(content: string): {
    appleCal: { compatible: boolean; notes: string[] };
    googleCal: { compatible: boolean; notes: string[] };
    iphone: { compatible: boolean; notes: string[] };
  } {
    const appleCal = { compatible: true, notes: [] as string[] };
    const googleCal = { compatible: true, notes: [] as string[] };
    const iphone = { compatible: true, notes: [] as string[] };

    // Check for features that might not work well on iPhone
    if (content.includes('\\n\\n')) {
      iphone.notes.push('Multiple line breaks may not render correctly');
    }

    // Check URL scheme compatibility
    if (content.includes('claude-session://')) {
      appleCal.notes.push('Custom URL scheme - clickable on Mac if handler installed');
      googleCal.notes.push('Custom URL scheme - may show as plain text in web version');
      iphone.notes.push('Custom URL scheme - will not be clickable (no handler)');
    }

    // Check for long descriptions
    const descMatches = content.match(/DESCRIPTION:([^\n]+)/g);
    if (descMatches) {
      descMatches.forEach(desc => {
        if (desc.length > 500) {
          iphone.notes.push('Long descriptions may be truncated on iPhone');
        }
      });
    }

    // Check for unicode/emoji
    if (/[\u{1F300}-\u{1F9FF}]/u.test(content)) {
      appleCal.notes.push('Contains emoji - should render correctly');
      googleCal.notes.push('Contains emoji - should render correctly');
      iphone.notes.push('Contains emoji - should render correctly');
    }

    // Check for special formatting
    if (content.includes('═') || content.includes('─')) {
      iphone.notes.push('Box-drawing characters may not display correctly on all devices');
    }

    return { appleCal, googleCal, iphone };
  }

  /**
   * Generate a validation report
   */
  generateReport(content: string): string {
    const validation = this.validateIcal(content);
    const compatibility = this.checkCompatibility(content);

    const lines: string[] = [];

    lines.push('iCal Validation Report');
    lines.push('='.repeat(60));
    lines.push('');

    // Overall status
    if (validation.valid) {
      lines.push('✅ Status: VALID');
    } else {
      lines.push('❌ Status: INVALID');
    }
    lines.push('');

    // Format info
    lines.push('Format:');
    lines.push(`  - Has VCALENDAR: ${validation.format.hasCalendar ? '✅' : '❌'}`);
    lines.push(`  - Has Events: ${validation.format.hasEvents ? '✅' : '❌'}`);
    lines.push(`  - Event Count: ${validation.format.eventCount}`);
    lines.push(`  - Required Fields: ${validation.format.requiredFieldsPresent ? '✅' : '❌'}`);
    lines.push('');

    // Errors
    if (validation.errors.length > 0) {
      lines.push('Errors:');
      validation.errors.forEach(error => {
        lines.push(`  ❌ ${error}`);
      });
      lines.push('');
    }

    // Warnings
    if (validation.warnings.length > 0) {
      lines.push('Warnings:');
      validation.warnings.forEach(warning => {
        lines.push(`  ⚠️  ${warning}`);
      });
      lines.push('');
    }

    // Compatibility
    lines.push('Calendar App Compatibility:');
    lines.push('');

    lines.push('  Apple Calendar (Mac):');
    lines.push(`    ${compatibility.appleCal.compatible ? '✅' : '❌'} Compatible`);
    compatibility.appleCal.notes.forEach(note => {
      lines.push(`      - ${note}`);
    });
    lines.push('');

    lines.push('  Google Calendar:');
    lines.push(`    ${compatibility.googleCal.compatible ? '✅' : '❌'} Compatible`);
    compatibility.googleCal.notes.forEach(note => {
      lines.push(`      - ${note}`);
    });
    lines.push('');

    lines.push('  iPhone Calendar:');
    lines.push(`    ${compatibility.iphone.compatible ? '✅' : '❌'} Compatible`);
    compatibility.iphone.notes.forEach(note => {
      lines.push(`      - ${note}`);
    });
    lines.push('');

    return lines.join('\n');
  }
}
