const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has admin permissions
 */
function isAdmin(member, settings = null) {
    // Server administrator
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    // Check configured admin roles
    if (settings && settings.adminRoles && settings.adminRoles.length > 0) {
        return member.roles.cache.some(role => settings.adminRoles.includes(role.id));
    }

    return false;
}

/**
 * Check if a member has support/staff permissions
 */
function isSupport(member, settings = null, category = null) {
    // Admins are also support
    if (isAdmin(member, settings)) {
        return true;
    }

    // Check global support roles
    if (settings && settings.supportRoles && settings.supportRoles.length > 0) {
        if (member.roles.cache.some(role => settings.supportRoles.includes(role.id))) {
            return true;
        }
    }

    // Check category-specific support roles
    if (category && category.supportRoles && category.supportRoles.length > 0) {
        if (member.roles.cache.some(role => category.supportRoles.includes(role.id))) {
            return true;
        }
    }

    // Check basic permissions
    if (member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return true;
    }

    return false;
}

/**
 * Check if member can manage a specific ticket
 */
function canManageTicket(member, ticket, settings = null, category = null) {
    // Ticket owner can manage their own ticket (limited actions)
    if (member.id === ticket.userId) {
        return true;
    }

    // Support staff can manage
    return isSupport(member, settings, category);
}

/**
 * Get support role IDs for a category (combines global and category-specific)
 */
function getSupportRoleIds(settings, category = null) {
    const roles = new Set();

    // Add global support roles
    if (settings && settings.supportRoles) {
        settings.supportRoles.forEach(role => roles.add(role));
    }

    // Add admin roles
    if (settings && settings.adminRoles) {
        settings.adminRoles.forEach(role => roles.add(role));
    }

    // Add category-specific roles
    if (category && category.supportRoles) {
        category.supportRoles.forEach(role => roles.add(role));
    }

    return Array.from(roles);
}

/**
 * Build permission overwrites for a ticket channel
 */
function buildTicketPermissions(guild, userId, supportRoleIds, addedMemberIds = []) {
    const overwrites = [
        // Deny everyone by default
        {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        // Allow ticket creator
        {
            id: userId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }
    ];

    // Allow support roles
    supportRoleIds.forEach(roleId => {
        overwrites.push({
            id: roleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
            ]
        });
    });

    // Allow added members
    addedMemberIds.forEach(memberId => {
        overwrites.push({
            id: memberId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    });

    return overwrites;
}

module.exports = {
    isAdmin,
    isSupport,
    canManageTicket,
    getSupportRoleIds,
    buildTicketPermissions
};
