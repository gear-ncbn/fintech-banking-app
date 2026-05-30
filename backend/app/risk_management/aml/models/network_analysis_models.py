"""
Network Analysis Models

Defines data structures for network analysis and link analysis in AML.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class NodeType(StrEnum):
    """Types of nodes in a network"""
    CUSTOMER = "customer"
    ACCOUNT = "account"
    TRANSACTION = "transaction"
    EXTERNAL_PARTY = "external_party"
    ORGANIZATION = "organization"
    ADDRESS = "address"
    PHONE = "phone"
    EMAIL = "email"
    DEVICE = "device"
    IP_ADDRESS = "ip_address"


class EdgeType(StrEnum):
    """Types of edges in a network"""
    OWNS = "owns"
    TRANSACTS_WITH = "transacts_with"
    TRANSFERS_TO = "transfers_to"
    RECEIVES_FROM = "receives_from"
    RELATED_TO = "related_to"
    SHARES_ADDRESS = "shares_address"
    SHARES_PHONE = "shares_phone"
    SHARES_DEVICE = "shares_device"
    EMPLOYED_BY = "employed_by"
    DIRECTOR_OF = "director_of"
    BENEFICIAL_OWNER = "beneficial_owner"


class NetworkRiskLevel(StrEnum):
    """Risk level of a network"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NetworkNode(BaseModel):
    """Node in a network graph"""
    node_id: str
    node_type: NodeType
    label: str
    display_name: str

    # Entity reference
    entity_id: str | None = None
    entity_type: str | None = None

    # Node properties
    properties: dict[str, Any] = Field(default_factory=dict)

    # Risk attributes
    risk_score: float = 0.0
    risk_flags: list[str] = Field(default_factory=list)
    is_pep: bool = False
    is_sanctioned: bool = False
    is_on_watchlist: bool = False

    # Centrality metrics
    degree_centrality: float = 0.0
    betweenness_centrality: float = 0.0
    closeness_centrality: float = 0.0
    pagerank: float = 0.0

    # Visual attributes
    size: float = 1.0
    color: str | None = None
    icon: str | None = None

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NetworkEdge(BaseModel):
    """Edge in a network graph"""
    edge_id: UUID = Field(default_factory=uuid4)
    source_node_id: str
    target_node_id: str
    edge_type: EdgeType

    # Edge properties
    label: str | None = None
    weight: float = 1.0
    is_directed: bool = True

    # Transaction-specific
    transaction_count: int = 0
    total_amount: float = 0.0
    currency: str | None = None
    first_transaction_date: datetime | None = None
    last_transaction_date: datetime | None = None

    # Relationship-specific
    relationship_start: datetime | None = None
    relationship_end: datetime | None = None
    is_active: bool = True

    # Risk attributes
    risk_score: float = 0.0
    risk_indicators: list[str] = Field(default_factory=list)

    # Visual attributes
    thickness: float = 1.0
    color: str | None = None
    style: str = "solid"  # solid, dashed, dotted

    # Additional properties
    properties: dict[str, Any] = Field(default_factory=dict)

    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NetworkCluster(BaseModel):
    """Cluster of related nodes"""
    cluster_id: UUID = Field(default_factory=uuid4)
    cluster_name: str
    cluster_type: str

    # Members
    node_ids: list[str] = Field(default_factory=list)
    central_node_id: str | None = None

    # Cluster metrics
    size: int = 0
    density: float = 0.0
    average_path_length: float = 0.0
    clustering_coefficient: float = 0.0

    # Risk assessment
    risk_score: float = 0.0
    risk_level: NetworkRiskLevel = NetworkRiskLevel.LOW
    risk_factors: list[str] = Field(default_factory=list)

    # Transaction summary
    total_transaction_count: int = 0
    total_transaction_amount: float = 0.0
    internal_transaction_count: int = 0
    external_transaction_count: int = 0

    # High-risk elements
    pep_count: int = 0
    sanctioned_count: int = 0
    high_risk_country_count: int = 0

    # Alert/case linkage
    related_alert_ids: list[UUID] = Field(default_factory=list)
    related_case_ids: list[UUID] = Field(default_factory=list)

    # Timestamps
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_analyzed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NetworkPath(BaseModel):
    """Path between nodes in a network"""
    path_id: UUID = Field(default_factory=uuid4)
    start_node_id: str
    end_node_id: str

    # Path details
    node_sequence: list[str] = Field(default_factory=list)
    edge_sequence: list[UUID] = Field(default_factory=list)
    path_length: int = 0

    # Transaction flow
    total_amount: float = 0.0
    transaction_count: int = 0
    time_span_hours: float = 0.0

    # Risk assessment
    risk_score: float = 0.0
    risk_indicators: list[str] = Field(default_factory=list)
    is_circular: bool = False


class NetworkAnalysis(BaseModel):
    """Complete network analysis"""
    analysis_id: UUID = Field(default_factory=uuid4)
    analysis_name: str
    analysis_type: str  # customer_network, transaction_network, risk_network

    # Scope
    root_entity_id: str | None = None
    root_entity_type: str | None = None
    depth: int = 2
    date_range_start: datetime | None = None
    date_range_end: datetime | None = None

    # Network structure
    nodes: list[NetworkNode] = Field(default_factory=list)
    edges: list[NetworkEdge] = Field(default_factory=list)
    clusters: list[NetworkCluster] = Field(default_factory=list)

    # Network metrics
    total_nodes: int = 0
    total_edges: int = 0
    density: float = 0.0
    average_degree: float = 0.0
    diameter: int = 0
    components: int = 1

    # Risk metrics
    overall_risk_score: float = 0.0
    risk_level: NetworkRiskLevel = NetworkRiskLevel.LOW
    high_risk_node_count: int = 0
    high_risk_path_count: int = 0
    circular_flow_count: int = 0

    # Key findings
    key_nodes: list[str] = Field(default_factory=list)  # High centrality nodes
    suspicious_paths: list[NetworkPath] = Field(default_factory=list)
    anomalies: list[dict[str, Any]] = Field(default_factory=list)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    processing_time_seconds: float = 0.0


class NetworkQuery(BaseModel):
    """Query for network analysis"""
    query_id: UUID = Field(default_factory=uuid4)

    # Starting point
    root_entity_type: str
    root_entity_id: str

    # Expansion parameters
    max_depth: int = 3
    max_nodes: int = 500
    node_types: list[NodeType] | None = None
    edge_types: list[EdgeType] | None = None

    # Filters
    date_range_start: datetime | None = None
    date_range_end: datetime | None = None
    min_transaction_amount: float | None = None
    include_inactive: bool = False

    # Risk filters
    min_risk_score: float | None = None
    include_pep: bool = True
    include_sanctioned: bool = True

    # Analysis options
    calculate_centrality: bool = True
    detect_clusters: bool = True
    find_circular_flows: bool = True
    calculate_risk: bool = True


class LinkAnalysisResult(BaseModel):
    """Result of link analysis between entities"""
    result_id: UUID = Field(default_factory=uuid4)

    # Entities analyzed
    entity_1_id: str
    entity_1_type: str
    entity_2_id: str
    entity_2_type: str

    # Connection analysis
    is_connected: bool = False
    shortest_path_length: int | None = None
    shortest_path: NetworkPath | None = None
    all_paths: list[NetworkPath] = Field(default_factory=list)

    # Shared elements
    shared_addresses: list[str] = Field(default_factory=list)
    shared_phones: list[str] = Field(default_factory=list)
    shared_devices: list[str] = Field(default_factory=list)
    shared_counterparties: list[str] = Field(default_factory=list)

    # Transaction relationship
    direct_transactions: int = 0
    indirect_transactions: int = 0
    total_flow_amount: float = 0.0

    # Risk assessment
    relationship_risk_score: float = 0.0
    risk_indicators: list[str] = Field(default_factory=list)

    # Timestamps
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommunityDetectionResult(BaseModel):
    """Result of community detection"""
    result_id: UUID = Field(default_factory=uuid4)
    analysis_id: UUID

    # Algorithm used
    algorithm: str  # louvain, label_propagation, girvan_newman
    parameters: dict[str, Any] = Field(default_factory=dict)

    # Communities detected
    community_count: int = 0
    communities: list[NetworkCluster] = Field(default_factory=list)

    # Quality metrics
    modularity: float = 0.0
    coverage: float = 0.0

    # Suspicious communities
    suspicious_community_count: int = 0
    suspicious_community_ids: list[UUID] = Field(default_factory=list)

    # Timestamps
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CircularFlowDetection(BaseModel):
    """Detection of circular money flows"""
    detection_id: UUID = Field(default_factory=uuid4)

    # Cycle details
    cycle_nodes: list[str] = Field(default_factory=list)
    cycle_edges: list[UUID] = Field(default_factory=list)
    cycle_length: int = 0

    # Flow analysis
    total_amount: float = 0.0
    currency: str = "USD"
    transaction_count: int = 0
    time_span_hours: float = 0.0

    # Timing analysis
    first_transaction_date: datetime
    last_transaction_date: datetime
    average_hop_time_hours: float = 0.0

    # Amount analysis
    initial_amount: float = 0.0
    final_amount: float = 0.0
    amount_variance: float = 0.0

    # Risk assessment
    risk_score: float = 0.0
    pattern_type: str  # round_tripping, layering, cycling
    confidence: float = 0.0

    # Alert linkage
    alert_generated: bool = False
    alert_id: UUID | None = None

    # Timestamps
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NetworkVisualization(BaseModel):
    """Visualization data for network"""
    visualization_id: UUID = Field(default_factory=uuid4)
    analysis_id: UUID

    # Layout
    layout_algorithm: str  # force_directed, hierarchical, circular
    layout_data: dict[str, tuple[float, float]] = Field(default_factory=dict)  # node_id -> (x, y)

    # Styling
    node_styles: dict[str, dict[str, Any]] = Field(default_factory=dict)
    edge_styles: dict[str, dict[str, Any]] = Field(default_factory=dict)

    # Filters applied
    filters: dict[str, Any] = Field(default_factory=dict)

    # Export formats
    svg_data: str | None = None
    json_data: dict[str, Any] | None = None

    # Timestamps
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NetworkStatistics(BaseModel):
    """Statistics for network analysis"""
    total_analyses: int = 0
    total_nodes_analyzed: int = 0
    total_edges_analyzed: int = 0
    clusters_detected: int = 0
    circular_flows_detected: int = 0
    high_risk_networks: int = 0
    average_network_size: float = 0.0
    average_analysis_time_seconds: float = 0.0
    alerts_generated: int = 0
