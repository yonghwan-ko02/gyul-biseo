# 데이터 모델 설계 문서

> 귤비서의 PostgreSQL 스키마 설계 및 관계 정의

---

## ERD (Entity Relationship Diagram)

```
farmers (농장주)
    │ 1
    │
    ├──── N ──── customers (거래처)
    │                 │ 1
    │                 │
    │                 └── N ──── shipments (출하 기록)
    │                                 │ 1
    │                                 │
    │                                 └── N ──── settlements (정산)
    │
    ├──── N ──── agri_logs (영농일지)
    │
    └──── N ──── labor_records (인력 기록)
```

---

## 테이블 상세 정의

### farmers (농장주)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| kakao_user_id | VARCHAR(100) | UNIQUE NOT NULL | 카카오 사용자 ID |
| name | VARCHAR(100) | NOT NULL | 농장주 이름 |
| farm_name | VARCHAR(200) | | 농장명 |
| phone | VARCHAR(20) | | 연락처 |
| bank_name | VARCHAR(50) | | 정산용 은행명 |
| bank_account | VARCHAR(50) | | 계좌번호 |
| bank_holder | VARCHAR(100) | | 예금주 |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

### customers (거래처)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| farmer_id | INT | FK(farmers.id) NOT NULL | |
| name | VARCHAR(100) | NOT NULL | 공식 이름 |
| aliases | TEXT[] | | 별명 배열 (삼춘, 영철이 등) |
| phone | VARCHAR(20) | | |
| kakao_user_id | VARCHAR(100) | | 정산서 발송용 |
| customer_type | VARCHAR(20) | NOT NULL | direct/wholesale/cooperative/acquaintance |
| address | TEXT | | |
| memo | TEXT | | |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft Delete |
| deleted_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### shipments (출하 기록)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| farmer_id | INT | FK NOT NULL | |
| customer_id | INT | FK NOT NULL | |
| variety | VARCHAR(50) | NOT NULL | 품종 (한라봉, 노지 등) |
| grade | VARCHAR(20) | | 등급 (상/중/하/로얄) |
| weight_kg | DECIMAL(5,1) | | 규격 kg |
| quantity | INT | NOT NULL | 수량 (박스) |
| unit_price | INT | | 단가 (원) |
| total_amount | INT | GENERATED | quantity × unit_price |
| is_paid | BOOLEAN | DEFAULT FALSE | 정산 완료 여부 |
| paid_amount | INT | DEFAULT 0 | 입금된 금액 |
| unpaid_amount | INT | GENERATED | total_amount - paid_amount |
| shipped_at | TIMESTAMP | DEFAULT NOW() | 실제 출하 일시 |
| memo | TEXT | | 추가 메모 |
| raw_input | TEXT | | STT 원문 (디버깅용) |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft Delete |
| deleted_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

### settlements (정산)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| shipment_id | INT | FK NOT NULL | |
| farmer_id | INT | FK NOT NULL | |
| amount | INT | NOT NULL | 입금액 |
| payment_method | VARCHAR(20) | | transfer/cash/other |
| paid_at | TIMESTAMP | DEFAULT NOW() | 입금 일시 |
| memo | TEXT | | |
| is_deleted | BOOLEAN | DEFAULT FALSE | |
| deleted_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### agri_logs (영농일지)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| farmer_id | INT | FK NOT NULL | |
| log_date | DATE | NOT NULL | 작업 일자 |
| activity_type | VARCHAR(50) | NOT NULL | spray/fertilize/prune/harvest/other |
| chemical_name | VARCHAR(100) | | 농약·비료명 |
| location | VARCHAR(200) | | 밭 위치·동 |
| quantity_used | DECIMAL(10,2) | | 사용량 |
| unit | VARCHAR(20) | | 단위 (L, kg 등) |
| worker_count | INT | | 작업 인원 |
| raw_input | TEXT | | 원문 음성 |
| memo | TEXT | | |
| is_deleted | BOOLEAN | DEFAULT FALSE | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### labor_records (인력 기록)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| farmer_id | INT | FK NOT NULL | |
| worker_name | VARCHAR(100) | NOT NULL | 인부 이름 |
| work_date | DATE | NOT NULL | 근무 일자 |
| daily_wage | INT | NOT NULL | 일당 (원) |
| hours_worked | DECIMAL(4,1) | | 근무 시간 |
| is_paid | BOOLEAN | DEFAULT FALSE | 급여 지급 여부 |
| paid_at | TIMESTAMP | | |
| memo | TEXT | | |
| is_deleted | BOOLEAN | DEFAULT FALSE | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### dialect_glossary (방언 사전)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | |
| dialect_term | VARCHAR(100) | NOT NULL | 방언·은어 |
| standard_term | VARCHAR(100) | NOT NULL | 표준어 |
| category | VARCHAR(50) | | variety/grade/unit/payment/activity |
| data_value | JSONB | | 변환 데이터 값 |
| priority | INT | DEFAULT 0 | 우선순위 (높을수록 먼저 적용) |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 인덱스 전략

```sql
-- shipments 자주 사용 쿼리 최적화
CREATE INDEX idx_shipments_farmer_id ON shipments(farmer_id);
CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_is_paid ON shipments(is_paid) WHERE NOT is_deleted;
CREATE INDEX idx_shipments_shipped_at ON shipments(shipped_at DESC);
CREATE INDEX idx_shipments_variety ON shipments(variety);

-- customers 별명 검색
CREATE INDEX idx_customers_aliases ON customers USING GIN(aliases);
CREATE INDEX idx_customers_farmer_id ON customers(farmer_id) WHERE NOT is_deleted;

-- agri_logs 날짜 범위 검색
CREATE INDEX idx_agri_logs_log_date ON agri_logs(log_date DESC);
CREATE INDEX idx_agri_logs_farmer_id ON agri_logs(farmer_id);

-- labor_records 인부별 조회
CREATE INDEX idx_labor_worker_name ON labor_records(worker_name, farmer_id);
CREATE INDEX idx_labor_work_date ON labor_records(work_date DESC);
```

---

## 주요 쿼리 패턴

### 미수금 전체 조회
```sql
SELECT 
    c.name,
    SUM(s.unpaid_amount) as total_unpaid,
    COUNT(*) as shipment_count
FROM shipments s
JOIN customers c ON s.customer_id = c.id
WHERE s.farmer_id = :farmer_id
  AND s.is_paid = FALSE
  AND s.is_deleted = FALSE
GROUP BY c.id, c.name
ORDER BY total_unpaid DESC;
```

### 특정 거래처 출하 이력
```sql
SELECT * FROM shipments
WHERE farmer_id = :farmer_id
  AND customer_id = :customer_id
  AND is_deleted = FALSE
ORDER BY shipped_at DESC
LIMIT 20;
```

### 품종별 연간 출하량
```sql
SELECT 
    variety,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_amount
FROM shipments
WHERE farmer_id = :farmer_id
  AND DATE_TRUNC('year', shipped_at) = DATE_TRUNC('year', NOW())
  AND is_deleted = FALSE
GROUP BY variety
ORDER BY total_quantity DESC;
```

---

*마지막 수정: 2026-05-27*
