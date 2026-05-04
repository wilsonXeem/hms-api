import { SQL, sql } from 'drizzle-orm';

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: SQL;
  where?: SQL;
}

export class QueryOptimizer {
  static paginate<T>(
    query: any,
    page: number = 1,
    pageSize: number = 20
  ): T {
    const offset = (page - 1) * pageSize;
    return query.limit(pageSize).offset(offset) as T;
  }

  static addFilters<T>(
    query: any,
    filters: Record<string, any>,
    allowedFields: string[]
  ): T {
    let filteredQuery = query;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        filteredQuery = filteredQuery.where(sql`${sql.identifier(key)} = ${value}`) as T;
      }
    });
    
    return filteredQuery;
  }

  static addDateRange<T>(
    query: any,
    dateField: string,
    startDate?: string,
    endDate?: string
  ): T {
    let filteredQuery = query;
    
    if (startDate) {
      filteredQuery = filteredQuery.where(
        sql`${sql.identifier(dateField)} >= ${startDate}`
      ) as T;
    }
    
    if (endDate) {
      filteredQuery = filteredQuery.where(
        sql`${sql.identifier(dateField)} <= ${endDate}`
      ) as T;
    }
    
    return filteredQuery;
  }

  static addSearch<T>(
    query: any,
    searchTerm: string,
    searchFields: string[]
  ): T {
    if (!searchTerm || searchFields.length === 0) return query;
    
    const searchConditions = searchFields.map(field => 
      sql`${sql.identifier(field)} ILIKE ${`%${searchTerm}%`}`
    );
    
    const combinedCondition = searchConditions.reduce((acc, condition) => 
      acc ? sql`${acc} OR ${condition}` : condition
    );
    
    return query.where(combinedCondition) as T;
  }

  static optimizeJoins<T>(
    query: any,
    requestedFields: string[]
  ): T {
    // Only join tables if their fields are actually requested
    // This would need to be implemented based on specific query structure
    return query;
  }
}

// Common query patterns
export const buildPatientQuery = (filters: any) => {
  const { page, pageSize, search, facilityId, startDate, endDate } = filters;
  
  return {
    pagination: { page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20 },
    search: search?.trim(),
    facilityFilter: facilityId,
    dateRange: { startDate, endDate }
  };
};

export const buildAppointmentQuery = (filters: any) => {
  const { page, pageSize, doctorId, status, date } = filters;
  
  return {
    pagination: { page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20 },
    doctorFilter: doctorId,
    statusFilter: status,
    dateFilter: date
  };
};
